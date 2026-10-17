-- Import a video into the "Shipreel" album in Photos (iCloud Photos then syncs it to your iPhone).
--   osascript scripts/photos-import.applescript /path/to/video.mp4 [AlbumName]
-- Prints "OK <count>" on success.
on run argv
	if (count of argv) < 1 then error "No file given."
	set theFile to POSIX file (item 1 of argv)
	set albumName to "Shipreel"
	if (count of argv) > 1 then set albumName to item 2 of argv
	tell application "Photos"
		if not (exists album albumName) then make new album named albumName
		set imported to import {theFile} into album albumName skip check duplicates true
		if imported is missing value then return "OK 0"
		return "OK " & (count of imported)
	end tell
end run
