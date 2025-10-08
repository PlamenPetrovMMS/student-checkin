document.addEventListener('DOMContentLoaded', function() {

    // Global list to store all students
    window.students = [];

    if(localStorage.getItem('loggedIn') !== 'true') {
        // Not logged in, redirect to login page
        window.location.href = 'index.html';
        return;
    }

    // Make uploadBtn open the hidden file input
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInputHidden = document.getElementById('fileInput');
    if (uploadBtn && fileInputHidden) {
        uploadBtn.addEventListener('click', function() {
            fileInputHidden.click();
        });
    }

    const downloadCheckInBtn = document.getElementById('downloadCheckInBtn');
    const downloadCheckOutBtn = document.getElementById('downloadCheckOutBtn');
    downloadCheckInBtn.addEventListener('click', function() {
        // Replace with your actual Google Sheet ID
        const checkinSheetId = '19oVNO93U2c8wNkbVeTsUOTh4XnbTb6zAD0siOTe1npE';
        const url1 = `https://docs.google.com/spreadsheets/d/${checkinSheetId}/export?format=xlsx`;
        const a1 = document.createElement('a');
        a1.href = url1;
        a1.download = 'Students_Check-In.xlsx';
        document.body.appendChild(a1);
        a1.click();
        document.body.removeChild(a1); 
    });
    downloadCheckOutBtn.addEventListener('click', function() {
        // Replace with your actual Google Sheet ID
        const checkoutSheetId = '1nARCKzvw08yDv6t9S3JnAAvLnEkDqWcOerjXjmkk4j8';
        const url2 = `https://docs.google.com/spreadsheets/d/${checkoutSheetId}/export?format=xlsx`;
        const a2 = document.createElement('a');
        a2.href = url2;
        a2.download = 'Students_Check-Out.xlsx';
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);
    });
    

        
    

    // const CHECK_IN_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyz7RYoBxvu8-x7ZoxEhOpLTALjWydaK2bNPBCXecQF8WY-f3KZ5pW4J0RHQptHilBrNg/exec';
    const CHECK_IN_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzO4VmW7AByNGZoxP7QNbXStdf_Apzr5ruOPZf_Smhage7jQV4p8Mq0NBArVh9DP-po-g/exec';

    // const CHECK_OUT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyf70mKCmo47tYLw2DNny9yAg8_-D8CO-fS5L53rMSFrfWcH4D88wmm-gL8nYmV_uyi_A/exec';
    const CHECK_OUT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5iruEIXcEYnCNUuFS_LwP9DgrV7C_3esXoAbaXNEv98OkJkURk1yBM5wMiSgtxUXa8g/exec';

    async function clearTables(attendanceType) {
        console.log('clearTables called with:', attendanceType);
        const sheetScriptUrl = attendanceType === 'joining' ? CHECK_IN_SCRIPT_URL : CHECK_OUT_SCRIPT_URL;
        console.log('Posting to URL:', sheetScriptUrl);
        const data = {
            action: 'clear'
        };
        console.log('Data to be sent:', data);

        try {
            const response = await fetch(sheetScriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                mode: 'no-cors' // To prevent CORS issues
            });
            
            const result = await response.text();
            console.log('Response from server:', result);

        }catch (error) {
            console.error('Error posting attendance:', error);
        }
    }

    const clearCheckInBtn = document.getElementById('clearCheckInBtn');
    const clearCheckOutBtn = document.getElementById('clearCheckOutBtn');
    clearCheckInBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all data from the Check-In sheet? This action cannot be undone.')) {
            clearTables('joining');
        }
    });
    clearCheckOutBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all data from the Check-Out sheet? This action cannot be undone.')) {
            clearTables('leaving');
        }
    });

    async function readOdtFileLineByLine(file) {

        try {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);
            const contentXml = await zip.file("content.xml").async("string");

            // Match all table rows
            const tableRowRegex = /<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/g;
            let match;
            while ((match = tableRowRegex.exec(contentXml)) !== null) {
                const rowXml = match[1];

                // Extract cell contents
                const cellRegex = /<table:table-cell[^>]*>([\s\S]*?)<\/table:table-cell>/g;
                const cells = [];
                let cellMatch;
                while ((cellMatch = cellRegex.exec(rowXml)) !== null) {
                    // Extract text from <text:p>...</text:p>
                    const textPMatch = cellMatch[1].match(/<text:p[^>]*>([\s\S]*?)<\/text:p>/);
                    let cellText = textPMatch ? textPMatch[1] : '';
                    // Remove nested tags and decode entities
                    cellText = cellText.replace(/<[^>]+>/g, "")
                                       .replace(/&lt;/g, "<")
                                       .replace(/&gt;/g, ">")
                                       .replace(/&amp;/g, "&")
                                       .replace(/&apos;/g, "'")
                                       .replace(/&quot;/g, '"')
                                       .replace(/\s+/g, " ")
                                       .trim();
                    cells.push(cellText);
                }

                // If row has at least 2 cells and second cell is a 9-digit number
                if (cells.length >= 2 && /^[0-9]{9}$/.test(cells[1])) {
                    // Fix stuck-together names (e.g., АлександърСтаниславовАнгелов)
                    let nameText = cells[0].replace(/\s+/g, ' ').trim();
                    // Insert space before each capital letter (Cyrillic and Latin) that follows a lowercase letter
                    nameText = nameText.replace(/([а-яa-z])([А-ЯA-Z])/g, '$1 $2');
                    window.students.push({
                        names: nameText,
                        facultyNumber: cells[1]
                    });
                }
            }

            console.log('Extracted students:', window.students);

            showPopupMessage(file.name, `Students found: ${window.students.length}`,
                    saveStudentsQRCodes,
                );

        } catch (err) {
            console.error('Error reading ODT file:', err);
        }

    }

    // Reads a .docx file line by line and logs non-empty lines
    function readDocxFileLineByLine(file) {
        console.log('Reading DOCX file:', file.name);
        mammoth.extractRawText({arrayBuffer: file})
            .then(function(result) {
                const text = result.value;
                const lines = text.split(/\r?\n/);
                let lineNumber = 1;
                const pattern = /^([\p{L}]+\s+){2,}[0-9]{9}$/u;
                const extractPattern = /^([\p{L}\s]+?)\s+([0-9]{9})$/u;
                console.log('Processing lines for student extraction...');

                lines.forEach((line) => {
                    const trimmed = line.trim().replace(/\s+/g, ' ');
                    if (trimmed === '') return;
                    if (pattern.test(trimmed)) {
                        console.log(`Line ${lineNumber} tested pattern:`, line);
                        const match = trimmed.match(extractPattern);
                        console.log(`Line ${lineNumber} extracted data:`, match);
                        if (match) {
                            const names = match[1].trim();
                            const facultyNumber = match[2];
                            const student = {
                                names: names,
                                facultyNumber: facultyNumber
                            };
                            window.students.push(student);
                            lineNumber++;
                            console.log(`students count:`, window.students.length);
                        } else {
                            console.log(`Match on line ${lineNumber}:`, trimmed);
                        }
                    }
                });
                console.log('Extracted students:', window.students);

                showPopupMessage(file.name, `Students found: ${window.students.length}`,
                    saveStudentsQRCodes,
                );

            })
            .catch(function(err) {
                console.error('Error reading .docx file:', err);
            });
    }

        // Shows a popup message with Save and Cancel buttons
        function showPopupMessage(filename, message, onSave, onCancel) {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = 0;
            overlay.style.left = 0;
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.background = 'rgba(0,0,0,0.8)';
            overlay.style.backdropFilter = 'blur(8px)';
            overlay.style.webkitBackdropFilter = 'blur(8px)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = 1000;

            // Create popup box
            const popup = document.createElement('div');
            // popup.style.background = 'linear-gradient(135deg, #0b59a7 0%, #007bff 100%)';
            popup.style.backgroundColor = '#fff';
            popup.style.color = '#000';
            popup.style.padding = '40px 32px';
            popup.style.borderRadius = '18px';
            popup.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
            popup.style.textAlign = 'center';
            popup.style.fontFamily = "'Rowdies', Arial, sans-serif";
            popup.style.fontSize = '1.25em';
            popup.style.minWidth = '320px';
            popup.style.maxWidth = '90vw';

            // Messages
            const msg1 = document.createElement('div');
            msg1.textContent = 'File loaded ✅';
            msg1.style.fontWeight = '500';
            msg1.style.fontSize = '1.4em';
            popup.appendChild(msg1);

            const msg2 = document.createElement('div');
            msg2.textContent = `${filename}`;
            msg2.style.marginBottom = '16px';
            msg2.style.fontWeight = '400';
            msg2.style.fontSize = '1em';
            popup.appendChild(msg2);

            const msg3 = document.createElement('div');
            msg3.textContent = message;
            msg3.style.marginBottom = '32px';
            msg3.style.fontWeight = '400';
            msg3.style.fontSize = '1.2em';
            popup.appendChild(msg3);

            // Save button
            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save QR Codes';
            saveBtn.style.margin = '0 18px';
            saveBtn.style.padding = '12px 32px';
            saveBtn.style.borderRadius = '8px';
            saveBtn.style.border = '2px solid #000';
            saveBtn.style.background = '#fff';
            saveBtn.style.color = '#000';
            saveBtn.style.fontWeight = 'normal';
            saveBtn.style.fontSize = '1em';
            saveBtn.style.fontFamily = "'Rowdies', Arial, sans-serif";
            saveBtn.style.cursor = 'pointer';
            saveBtn.style.transition = 'background 0.2s, color 0.2s';
            saveBtn.onmouseover = function() {
                saveBtn.style.background = '#000';
                saveBtn.style.color = '#fff';
            };
            saveBtn.onmouseout = function() {
                saveBtn.style.background = '#fff';
                saveBtn.style.color = '#000';
            };
            saveBtn.onclick = function() {
                document.body.removeChild(overlay);
                if (onSave) onSave();
            };
            popup.appendChild(saveBtn);

            // Cancel button
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.margin = '0 18px';
            cancelBtn.style.padding = '12px 32px';
            cancelBtn.style.borderRadius = '8px';
            cancelBtn.style.border = 'none';
            cancelBtn.style.background = '#fff';
            cancelBtn.style.color = '#c61313ff';
            cancelBtn.style.fontWeight = 'normal';
            cancelBtn.style.fontSize = '1em';
            cancelBtn.style.fontFamily = "'Rowdies', Arial, sans-serif";
            cancelBtn.style.cursor = 'pointer';
            cancelBtn.style.transition = 'background 0.2s, color 0.2s';
            cancelBtn.onmouseover = function() {
                cancelBtn.style.background = '#c61313ff';
                cancelBtn.style.color = '#fff';
            };
            cancelBtn.onmouseout = function() {
                cancelBtn.style.background = '#fff';
                cancelBtn.style.color = '#c61313ff';
            };
            cancelBtn.onclick = function() {
                document.body.removeChild(overlay);
                // Reset file input so user can upload again
                var fileInput = document.getElementById('fileInput');
                if (fileInput) fileInput.value = '';
                // Reset students list
                window.students = [];
                if (onCancel) onCancel();
            };
            popup.appendChild(cancelBtn);

            overlay.appendChild(popup);
            document.body.appendChild(overlay);
        }

    function saveStudentsQRCodes() {
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
            console.log('Resetting file input and students list.');
            document.getElementById('fileInput').value = '';
            window.students = [];
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

    fileInput.addEventListener('change', function() {
        if (fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.docx')) {
                console.log('Reading DOCX file:', file);
                // Use mammoth.js to extract text from docx
                readDocxFileLineByLine(file);
                
            }else if(fileName.endsWith('.odt')){
                console.log('Reading ODT file:', file);
                readOdtFileLineByLine(file);

            } else {
                console.log('Reading text file:', file);
                // Assume text file
                readTextFileLineByLine(file);
            }
        }
    });

    document.getElementById('scanBtn').addEventListener('click', function() {
        window.location.href = 'scanningPage.html';
    });
});
