#!/bin/bash
# Script to create placeholder icons using ImageMagick

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick not found. Installing..."
    apt-get update && apt-get install -y imagemagick 2>/dev/null || {
        echo "Cannot install ImageMagick automatically."
        echo "Please install it manually or create PNG icons from icon.svg"
        echo "See icons/README.md for instructions"
        exit 1
    }
fi

echo "Creating PNG icons from SVG..."

# Create PNG icons with different sizes
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png

echo "Icons created successfully!"
ls -lh icon*.png
