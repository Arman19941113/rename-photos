![](./docs/images/coverview-en.jpg)

# Rename Photos

Rename Photos is a cross-platform desktop application primarily focused on renaming photos. It uses the image's EXIF data to rename files.

- It's also compatible with videos that include metadata like `Date`, `Make`, `Camera`.
- For files without EXIF data, date-related variables can be used, with the data parsed from the file's created date.

## Download

A compact bundle size of just 6MB:

- [MacOs (Apple silicon)](https://github.com/Arman19941113/rename-photos/releases/download/v1.0.0/Rename.Photos_1.0.0_aarch64.dmg)
- [MacOs (Intel silicon)](https://github.com/Arman19941113/rename-photos/releases/download/v1.0.0/Rename.Photos_1.0.0_x64.dmg)
- [Windows](https://github.com/Arman19941113/rename-photos/releases/download/v1.0.0/Rename.Photos_1.0.0_x64_en-US.msi)
- [Linux](https://github.com/Arman19941113/rename-photos/releases/download/v1.0.0/Rename.Photos_1.0.0_amd64.deb)

## Q & A

### Supported image formats?

Using [exif-rs](https://github.com/kamadak/exif-rs) to parse EXIF data:

- TIFF and some RAW image formats based on it
- JPEG
- HEIF and coding-specific variations including HEIC and AVIF
- PNG
- WebP

### MacOS: App is damaged and can't be opened?

Code signing is expensive, open Terminal and then enter the following command to fix this issue:

```bash
sudo xattr -d -r com.apple.quarantine /Applications/Rename\ Photos.app
```

### Is this app safe?

- Open source
- Only rename files
