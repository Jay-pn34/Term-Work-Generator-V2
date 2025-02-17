function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

function generatePDF(data) {
  var templateId = "14xPYnKg2fU07kTcma0t_mFjmwWXN6jIkdpj21JfCtQ8";
  var folder = DriveApp.getFolderById("1RnFjY4y-Eus2SgcZXXMrTSwif4hypGFV");
  var pdfFiles = [];

  data.practicals.forEach(function(practical) {
    var docCopy = DriveApp.getFileById(templateId).makeCopy(folder);
    var doc = DocumentApp.openById(docCopy.getId());
    var body = doc.getBody();

    body.replaceText('<Name>', data.name);
    body.replaceText('<PEN>', data.pen);
    body.replaceText('<Subject>', data.subject);
    body.replaceText('<Term>', data.term);
    body.replaceText('<Semester>', data.semester);
    body.replaceText('<Class>', data.className);
    body.replaceText('<Batch>', data.batch);
    body.replaceText('<CheckedBy>', data.checkedBy);
    body.replaceText('<PracticalNumber>', practical.number);
    body.replaceText('<ExperimentName>', practical.name);

    doc.saveAndClose();

    var pdf = docCopy.getAs('application/pdf');
    var pdfFile = folder.createFile(pdf);
    pdfFiles.push(pdfFile.getId());
  });

  mergePDFs(pdfFiles).then(mergedPdfId => {
    if (mergedPdfId) {
      Logger.log("Merged PDF ID: " + mergedPdfId);
      sendEmailWithPDF(data.email, mergedPdfId);
      scheduleDeletion([mergedPdfId]);
    } else {
      Logger.log("Merging failed, no file to send.");
    }
  }).catch(error => Logger.log("Error merging PDFs: " + error));
}

function mergePDFs(fileIds) {
  var pdfBlobs = fileIds.map(id => extractSecondPage(DriveApp.getFileById(id)));

  return Promise.all(pdfBlobs).then(filteredBlobs => {
    return PDFApp.mergePDFs(filteredBlobs)
      .then(newBlob => {
        var mergedFile = DriveApp.getFolderById("1RnFjY4y-Eus2SgcZXXMrTSwif4hypGFV").createFile(newBlob);
        return mergedFile.getId();
      });
  }).catch(err => {
    Logger.log("Error merging PDFs: " + err);
    return null;
  });
}

function extractSecondPage(file) {
  return PDFApp.setPDFBlob(file.getBlob()).splitPDF()
    .then(blobs => {
      if (blobs.length > 1) {
        return blobs[1]; // Take only the second page
      }
      return null;
    })
    .catch(err => {
      Logger.log("Error extracting second page: " + err);
      return null;
    });
}

function sendEmailWithPDF(email, fileId) {
  try {
    console.log("Attempting to fetch file with ID: " + fileId);
    var file = DriveApp.getFileById(fileId);
    
    if (!file) {
      console.log("File not found!");
      return;
    }

    var blob = file.getBlob(); // Get the PDF as a blob

    GmailApp.sendEmail(email, "Your Generated Term Work PDF", "Please find your Term Work PDF attached.", {
      attachments: [blob]
    });

    console.log("Email sent successfully to: " + email);
  } catch (e) {
    console.log("Error sending email: " + e.toString());
  }
}

function scheduleDeletion(fileIds) {
  ScriptApp.newTrigger('deleteFiles')
    .timeBased()
    .after(5 * 60 * 1000) // 5 minutes
    .create();
  PropertiesService.getScriptProperties().setProperty('filesToDelete', JSON.stringify(fileIds));
}

function deleteFiles() {
  var filesToDelete = JSON.parse(PropertiesService.getScriptProperties().getProperty('filesToDelete')) || [];
  filesToDelete.forEach(function(id) {
    try {
      var file = DriveApp.getFileById(id);
      if (file) {
        file.setTrashed(true);
        Logger.log("Deleted file: " + id);
      }
    } catch (e) {
      Logger.log("Error deleting file: " + id + " - " + e.toString());
    }
  });
}
