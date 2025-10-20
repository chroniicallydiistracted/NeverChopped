from __future__ import annotations

from collections import deque
from pathlib import Path
from typing import Iterable, Tuple

import numpy as np
from PIL import Image


SOURCE_ROOT = Path("assets/uniforms")
OUTPUT_ROOT = Path("assets/uniform_parts")

# (label, (left, top, right, bottom)) where right/bottom are exclusive
BOUNDING_BOXES: Iterable[Tuple[str, Tuple[int, int, int, int]]] = (
    ("helmet_right", (30, 56, 560, 360)),
    ("jersey_front", (30, 393, 560, 1570)),
    ("helmet_left", (721, 56, 1251, 360)),
    ("jersey_back", (721, 393, 1251, 1570)),
)

WHITE_THRESHOLD = 245
GREY_RGB = (149, 149, 149)
GREY_TOLERANCE = 30
OUTLINE_SEARCH_DEPTH = 3
GREY_RATIO_THRESHOLD = 0.35
TOP_PADDING = 5
BOTTOM_PADDING = 5
SEARCH_MARGIN = 180


def _grey_ratio(row: np.ndarray) -> float:
    colors = row[:, :3]
    diff = np.abs(colors - np.array(GREY_RGB))
    mask = np.all(diff <= GREY_TOLERANCE, axis=1)
    return float(mask.mean())


def find_vertical_bounds(image_array: np.ndarray, x0: int, y0: int, x1: int, y1: int) -> Tuple[int, int]:
    """Dynamically adjust vertical slice so grey jersey borders are preserved."""
    height = image_array.shape[0]
    x0 = max(0, x0)
    y0 = max(0, y0)
    x1 = min(image_array.shape[1], x1)
    y1 = min(height, y1)

    def row_is_background(y: int) -> bool:
        row = image_array[y, x0:x1, :3]
        return np.all(row >= WHITE_THRESHOLD)

    # Locate top border (scan upward from the starting guess)
    top = y0
    top_limit = max(0, y0 - SEARCH_MARGIN)
    fallback_top = top
    for y in range(y0, top_limit - 1, -1):
        ratio = _grey_ratio(image_array[y, x0:x1])
        if row_is_background(y):
            continue
        fallback_top = y
        if ratio >= GREY_RATIO_THRESHOLD:
            top = max(0, y - TOP_PADDING)
            break
    else:
        top = max(0, fallback_top - TOP_PADDING)

    # Locate bottom border
    bottom = y1
    bottom_limit = min(height, y1 + SEARCH_MARGIN)
    for y in range(y1 - 1, bottom_limit):
        if y >= height:
            break
        ratio = _grey_ratio(image_array[y, x0:x1])
        if row_is_background(y):
            continue
        bottom = min(height, y + 1 + BOTTOM_PADDING)
        if ratio >= GREY_RATIO_THRESHOLD:
            break
        break

    if bottom <= top:
        return y0, y1

    return top, bottom


def remove_white_background(image: Image.Image) -> Image.Image:
    """Flood-fill from the borders and erase only the white backdrop, stopping at grey outlines."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    def is_candidate(x: int, y: int) -> bool:
        r, g, b, _ = pixels[x, y]
        return r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD

    def is_outline(x: int, y: int) -> bool:
        r, g, b, _ = pixels[x, y]
        return all(abs(component - anchor) <= GREY_TOLERANCE for component, anchor in zip((r, g, b), GREY_RGB))

    visited = [[False] * height for _ in range(width)]
    queue: deque[Tuple[int, int]] = deque()

    top_outline = [False] * width
    bottom_outline = [False] * width
    left_outline = [False] * height
    right_outline = [False] * height

    max_top_depth = min(OUTLINE_SEARCH_DEPTH, height)
    max_side_depth = min(OUTLINE_SEARCH_DEPTH, width)

    for x in range(width):
        for dy in range(max_top_depth):
            if is_outline(x, dy):
                top_outline[x] = True
                break
    for x in range(width):
        for dy in range(max_top_depth):
            y = height - 1 - dy
            if is_outline(x, y):
                bottom_outline[x] = True
                break
    for y in range(height):
        for dx in range(max_side_depth):
            if is_outline(dx, y):
                left_outline[y] = True
                break
    for y in range(height):
        for dx in range(max_side_depth):
            x = width - 1 - dx
            if is_outline(x, y):
                right_outline[y] = True
                break

    for x in range(width):
        if top_outline[x]:
            continue
        y = 0
        if is_candidate(x, y) and not visited[x][y]:
            visited[x][y] = True
            queue.append((x, y))

    y = height - 1
    for x in range(width):
        if bottom_outline[x]:
            continue
        if is_candidate(x, y) and not visited[x][y]:
            visited[x][y] = True
            queue.append((x, y))

    for y in range(height):
        if left_outline[y]:
            continue
        x = 0
        if is_candidate(x, y) and not visited[x][y]:
            visited[x][y] = True
            queue.append((x, y))

    x = width - 1
    for y in range(height):
        if right_outline[y]:
            continue
        if is_candidate(x, y) and not visited[x][y]:
            visited[x][y] = True
            queue.append((x, y))

    # Flood fill through connected background pixels until outlines are reached
    while queue:
        x, y = queue.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height:
                if not visited[nx][ny] and is_candidate(nx, ny) and not is_outline(nx, ny):
                    visited[nx][ny] = True
                    queue.append((nx, ny))

    for x in range(width):
        for y in range(height):
            if visited[x][y]:
                r, g, b, _ = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)

    return rgba


def split_uniform(uniform_path: Path) -> None:
    relative_parts = uniform_path.relative_to(SOURCE_ROOT)
    if len(relative_parts.parts) < 3:
        raise ValueError(f"Unexpected uniform path structure: {uniform_path}")

    season = relative_parts.parts[0]
    team = relative_parts.parts[1]
    style = uniform_path.stem  # e.g. "A"

    output_dir = OUTPUT_ROOT / season / team / style
    output_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(uniform_path).convert("RGBA") as image:
        image_array = np.array(image)
        for label, box in BOUNDING_BOXES:
            x0, y0, x1, y1 = box
            if "jersey" in label:
                y0, y1 = find_vertical_bounds(image_array, x0, y0, x1, y1)
            cropped = image.crop((x0, y0, x1, y1))
            destination = output_dir / f"{style}_{label}.png"
            processed = remove_white_background(cropped)
            processed.save(destination)


def main() -> None:
    if not SOURCE_ROOT.exists():
        raise SystemExit(f"Source directory not found: {SOURCE_ROOT}")

    png_files = sorted(SOURCE_ROOT.glob("*/*/*.png"))
    if not png_files:
        raise SystemExit(f"No uniform PNG files found under {SOURCE_ROOT}")

    for uniform_path in png_files:
        split_uniform(uniform_path)

    print(f"Processed {len(png_files)} uniform images into {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()
