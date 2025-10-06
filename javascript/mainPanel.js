document.addEventListener('DOMContentLoaded', function() {

    if(localStorage.getItem('loggedIn') !== 'true') {
        // Not logged in, redirect to login page
        window.location.href = 'login.html';
        return;
    }

    // Global list to store all students
    window.students = [];

    // Reads a .docx file line by line and logs non-empty lines
    function readDocxFileLineByLine(file) {
        mammoth.extractRawText({arrayBuffer: file})
            .then(function(result) {
                const text = result.value;
                const lines = text.split(/\r?\n/);
                let lineNumber = 1;
                // Regex: 2 or more words (Cyrillic or Latin), then a 9-digit number, all separated by spaces
                // Handles extra spaces and names stuck together
                const pattern = /^([\p{L}]+\s+){2,}[0-9]{9}$/u;
                const extractPattern = /^([\p{L}\s]+?)\s+([0-9]{9})$/u;

                lines.forEach((line) => {
                    const trimmed = line.trim().replace(/\s+/g, ' ');
                    if (trimmed === '') return;
                    if (pattern.test(trimmed)) {
                        const match = trimmed.match(extractPattern);
                        if (match) {
                            const names = match[1].trim();
                            const facultyNumber = match[2];
                            const student = {
                                names: names,
                                facultyNumber: facultyNumber
                            };
                            window.students.push(student);
                        } else {
                            console.log(`Match on line ${lineNumber}:`, trimmed);
                        }
                    }
                    lineNumber++;
                });
            })
            .catch(function(err) {
                console.error('Error reading .docx file:', err);
            });
    }

    // Shows a popup message with Save and Cancel buttons
    function showPopupMessage(message, onSave, onCancel) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = 1000;

        // Create popup box
        const popup = document.createElement('div');
        popup.style.background = '#fff';
        popup.style.padding = '32px 24px';
        popup.style.borderRadius = '8px';
        popup.style.boxShadow = '0 2px 16px rgba(0,0,0,0.2)';
        popup.style.textAlign = 'center';

        // Message
        const msg = document.createElement('div');
        msg.textContent = message;
        msg.style.marginBottom = '24px';
        popup.appendChild(msg);

        // Save button
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.style.margin = '0 12px';
        saveBtn.onclick = function() {
            document.body.removeChild(overlay);
            if (onSave) onSave();
        };
        popup.appendChild(saveBtn);

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.margin = '0 12px';
        cancelBtn.onclick = function() {
            document.body.removeChild(overlay);
            if (onCancel) onCancel();
        };
        popup.appendChild(cancelBtn);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);
    }

    function saveStundetsQRCodes() {
    if (window.students && window.students.length > 0) {
        const zip = new JSZip();
        let completed = 0;
        window.students.forEach((student, idx) => {
            console.log(`Processing student ${idx + 1}:`, student);
            const qrData = `${student.names} ${student.facultyNumber}`;
            console.log(`QR data for student ${idx + 1}:`, qrData, 'Length:', qrData.length);
            try {
                // Use kjua to generate QR code as image
                const qrImg = kjua({
                    text: qrData,
                    size: 256,
                    render: 'image',
                    ecLevel: 'L',
                });
                if (qrImg && qrImg.src) {
                    zip.file(`${student.names.replace(/\s+/g, '_')}_${student.facultyNumber}.png`, qrImg.src.split(',')[1], {base64: true});
                    console.log(`QR code generated for student ${idx + 1}`);
                } else {
                    console.log(`No QR image found for student ${idx + 1}`);
                }
                completed++;
                if (completed === window.students.length) {
                    console.log('All QR codes generated, zipping...');
                    zip.generateAsync({type: 'blob'}).then(function(content) {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(content);
                        a.download = 'students_qrcodes.zip';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        console.log('Download triggered.');
                    });
                }
            } catch (err) {
                console.error(`Error generating QR for student ${idx + 1}:`, err);
            }
        });
    } else {
        console.log('No students found.');
    }
}

    // Reads a .txt file line by line and logs non-empty lines
    function readTextFileLineByLine(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const lines = text.split(/\r?\n/);
            let lineNumber = 1;
            lines.forEach((line) => {
                if (line.trim() === '') return;
                console.log(`Line ${lineNumber++}:`, line);
            });
        };
        reader.readAsText(file);
    }

    const fileInput = document.getElementById('fileInput');
    document.getElementById('uploadBtn').addEventListener('click', function() {
        fileInput.value = '';
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        if (fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.docx')) {
                // Use mammoth.js to extract text from docx
                readDocxFileLineByLine(file);
                showPopupMessage('File loaded. Do you want to save the QR codes?',
                    saveStundetsQRCodes,
                );
            } else {
                // Assume text file
                readTextFileLineByLine(file);
            }
        }
    });

    document.getElementById('scanBtn').addEventListener('click', function() {
        window.location.href = 'scanningPage.html';
    });
});
