function deleteFilesInFolder() {
  var folderId = "1RnFjY4y-Eus2SgcZXXMrTSwif4hypGFV"; // Folder ID
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();

  if (!files.hasNext()) { // Check if the folder is empty
    Logger.log("Folder is already empty.");
    return "Folder is already empty.";
  }

  while (files.hasNext()) {
    var file = files.next();
    Logger.log("Deleting: " + file.getName());
    DriveApp.removeFile(file); // Remove from Drive
    file.setTrashed(true); // Move to trash
  }

  // Now, clear the trash permanently
  Drive.Files.emptyTrash();
  Logger.log("All files permanently deleted.");
  return "All files permanently deleted.";
}
