//! Image and video metadata extraction used by file loading.

mod exif;
mod image;
mod video;

pub(crate) use image::{ImageMetadata, analyze_image_metadata};
pub(crate) use video::{VideoMetadata, analyze_video_metadata};
