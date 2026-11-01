#!/usr/bin/env python3
"""Derive small, metadata-preserving fixtures; requires ImageMagick and FFmpeg."""

import argparse
import json
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path

REPOSITORY = Path(__file__).resolve().parent.parent
FIXTURES = REPOSITORY / "tests" / "fixtures"
PRIMARY_TAGS = {0x010F, 0x0110, 0x0112}
EXIF_TAGS = {0x829A, 0x829D, 0x8827, 0x9003, 0xA405, 0xA434}
TYPE_SIZES = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Original media directory (read-only)")
    args = parser.parse_args()
    source = args.source.resolve(strict=True)
    destination = FIXTURES / "media"
    if source == destination.resolve():
        parser.error("The source must be separate from the checked-in fixtures")
    for tool in ("magick", "ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            parser.error(f"Missing required tool: {tool}")

    manifest_path = FIXTURES / "real-media.json"
    manifest = json.loads(manifest_path.read_text())
    for fixture in manifest["files"]:
        path = source / fixture["input"]["filename"]
        if not path.is_file():
            parser.error(f"Missing source fixture: {path}")

    # Generate everything before replacing the current corpus or its size manifest.
    with tempfile.TemporaryDirectory(prefix="rename-photos-fixtures-") as temporary:
        staging = Path(temporary)
        for fixture in manifest["files"]:
            name = fixture["input"]["filename"]
            original, small = source / name, staging / name
            suffix = original.suffix.lower()
            if fixture["input"]["fileType"] == "video":
                prepare_video(original, small)
            elif suffix == ".arw":
                small.write_bytes(compact_tiff(original.read_bytes()))
            elif suffix == ".rw2":
                prepare_rw2(original, small, staging)
            elif fixture["input"]["fileType"] == "image":
                prepare_image(original, small, staging)
            else:
                shutil.copyfile(original, small)
            fixture["sourceSize"] = original.stat().st_size
            fixture["input"]["size"] = small.stat().st_size
            print(f"{name}: {fixture['sourceSize']:,} -> {small.stat().st_size:,} bytes")

        total = sum(fixture["input"]["size"] for fixture in manifest["files"])
        if total > 256 * 1024:
            raise ValueError(f"Fixture corpus exceeds the 256 KiB budget: {total} bytes")
        destination.mkdir(parents=True, exist_ok=True)
        for fixture in manifest["files"]:
            name = fixture["input"]["filename"]
            shutil.copyfile(staging / name, destination / name)
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
        print(f"Total checked-in media: {total:,} bytes")


def prepare_image(source, destination, staging):
    original_profile = staging / "original.exif"
    run("magick", str(source), f"EXIF:{original_profile}")
    # ImageMagick imports this binary profile as EXIF when its extension is APP1.
    profile = staging / "sanitized.app1"
    profile.write_bytes(b"Exif\0\0" + compact_tiff(original_profile.read_bytes()[6:]))
    run(
        "magick", str(source), "-resize", "16x16", "-strip",
        "-profile", str(profile), str(destination),
    )


def prepare_rw2(source, destination, staging):
    data = source.read_bytes()
    endian = "<" if data[:2] == b"II" else ">"
    primary = read_ifd(data, endian, struct.unpack_from(endian + "I", data, 4)[0])
    jpeg = primary[0x002E][2]
    profile = jpeg_exif(jpeg)
    clean_jpeg = staging / "rw2-preview.jpg"
    clean_profile = staging / "rw2.app1"
    clean_profile.write_bytes(b"Exif\0\0" + compact_tiff(profile))
    run(
        "magick", "-size", "16x16", "xc:black", "-strip",
        "-profile", str(clean_profile), str(clean_jpeg),
    )
    destination.write_bytes(compact_tiff(data, header_size=24, jpeg=clean_jpeg.read_bytes()))


def prepare_video(source, destination):
    probe = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format_tags", "-of", "json", str(source),
    ])
    tags = json.loads(probe)["format"].get("tags", {})
    metadata = []
    for key in ("creation_time", "com.apple.quicktime.make", "com.apple.quicktime.model"):
        if key in tags:
            metadata.extend(["-metadata", f"{key}={tags[key]}"])
    run(
        "ffmpeg", "-v", "error", "-nostdin", "-y", "-i", str(source),
        "-map", "0:v:0", "-frames:v", "1", "-vf", "scale=16:16,format=yuv420p",
        "-c:v", "libx264", "-preset", "veryslow", "-crf", "35",
        "-map_metadata", "-1", "-map_metadata:s", "-1", "-map_chapters", "-1",
        "-fflags", "+bitexact", "-flags:v", "+bitexact", *metadata,
        "-movflags", "+use_metadata_tags", str(destination),
    )
    if source.suffix.lower() == ".mov":
        destination.write_bytes(quicktime_metadata(destination.read_bytes()))


def quicktime_metadata(data):
    movie_boxes = list(boxes(data))
    if movie_boxes[-1][0] != b"moov":
        raise ValueError("Expected a trailing moov box so media offsets remain unchanged")
    output = bytearray()
    for kind, body in movie_boxes:
        if kind == b"moov":
            children = bytearray()
            metadata = None
            for child_kind, child_body in boxes(body):
                if child_kind == b"udta":
                    remaining = bytearray()
                    for tag, value in boxes(child_body):
                        if tag == b"meta":
                            # Match the source MOV's moov/meta layout (no FullBox flags).
                            metadata = value[4:]
                        else:
                            remaining.extend(box(tag, value))
                    if remaining:
                        children.extend(box(child_kind, remaining))
                else:
                    children.extend(box(child_kind, child_body))
            if metadata is None:
                raise ValueError("FFmpeg did not write the expected MOV metadata")
            body = children + box(b"meta", metadata)
        output.extend(box(kind, body))
    return output


def boxes(data):
    offset = 0
    while offset < len(data):
        size, kind = struct.unpack_from(">I4s", data, offset)
        if size < 8 or offset + size > len(data):
            raise ValueError("Invalid box in generated media")
        yield kind, data[offset + 8:offset + size]
        offset += size


def box(kind, body):
    return struct.pack(">I4s", len(body) + 8, kind) + body


def compact_tiff(data, header_size=8, jpeg=None):
    endian = "<" if data[:2] == b"II" else ">"
    primary = read_ifd(data, endian, struct.unpack_from(endian + "I", data, 4)[0])
    exif = {}
    if 0x8769 in primary:
        offset = struct.unpack(endian + "I", primary[0x8769][2])[0]
        exif = read_ifd(data, endian, offset)
    primary = {tag: value for tag, value in primary.items() if tag in PRIMARY_TAGS}
    exif = {tag: value for tag, value in exif.items() if tag in EXIF_TAGS}

    if jpeg is not None:
        primary[0x002E] = (7, len(jpeg), jpeg)
    if exif:
        exif_offset = header_size + 2 + (len(primary) + 1) * 12 + 4
        primary[0x8769] = (4, 1, struct.pack(endian + "I", exif_offset))

    header = bytearray(data[:header_size])
    struct.pack_into(endian + "I", header, 4, header_size)
    output = header + bytearray(2 + len(primary) * 12 + 4)
    if exif:
        output.extend(bytearray(2 + len(exif) * 12 + 4))
    write_ifd(output, endian, header_size, primary)
    if exif:
        write_ifd(output, endian, exif_offset, exif)
    return output


def read_ifd(data, endian, offset):
    count = struct.unpack_from(endian + "H", data, offset)[0]
    entries = {}
    for index in range(count):
        position = offset + 2 + 12 * index
        tag, kind, count, location = struct.unpack_from(endian + "HHII", data, position)
        if kind not in TYPE_SIZES:
            continue
        length = TYPE_SIZES[kind] * count
        start = position + 8 if length <= 4 else location
        value = data[start:start + length]
        if len(value) != length:
            raise ValueError(f"Truncated TIFF tag {tag:#x}")
        entries[tag] = (kind, count, value)
    return entries


def write_ifd(output, endian, offset, entries):
    struct.pack_into(endian + "H", output, offset, len(entries))
    for index, (tag, (kind, count, value)) in enumerate(sorted(entries.items())):
        position = offset + 2 + 12 * index
        struct.pack_into(endian + "HHI", output, position, tag, kind, count)
        if len(value) <= 4:
            output[position + 8:position + 12] = value.ljust(4, b"\0")
        else:
            if len(output) % 2:
                output.append(0)
            struct.pack_into(endian + "I", output, position + 8, len(output))
            output.extend(value)


def jpeg_exif(data):
    position = 2
    while position < len(data):
        marker = data[position:position + 2]
        if marker in (b"\xff\xda", b"\xff\xd9"):
            break
        length = int.from_bytes(data[position + 2:position + 4], "big")
        payload = data[position + 4:position + 2 + length]
        if marker == b"\xff\xe1" and payload.startswith(b"Exif\0\0"):
            return payload[6:]
        if length < 2:
            break
        position += 2 + length
    raise ValueError("No EXIF profile in the RW2 embedded JPEG")


def run(*command):
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL)


if __name__ == "__main__":
    main()
