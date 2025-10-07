document.addEventListener('DOMContentLoaded', function() {

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

    // Global list to store all students
    window.students = [];

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

            showPopupMessage(`File loaded ✅ Students found: ${window.students.length}`,
                    saveStudentsQRCodes,
                );

        } catch (err) {
            console.error('Error reading ODT file:', err);
        }

    }

    // Reads a .docx file line by line and logs non-empty lines
    function readDocxFileLineByLine(file) {
        console.log('Reading DOCX file:', file);
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

                showPopupMessage(`File loaded ✅ Students found: ${window.students.length}`,
                    saveStudentsQRCodes,
                );

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

            // Message
            const msg = document.createElement('div');
            msg.textContent = message;
            msg.style.marginBottom = '32px';
            msg.style.fontWeight = '400';
            msg.style.fontSize = '1.2em';
            popup.appendChild(msg);

            // Save button
            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save QR Codes';
            saveBtn.style.margin = '0 18px';
            saveBtn.style.padding = '12px 32px';
            saveBtn.style.borderRadius = '8px';
            saveBtn.style.border = 'none';
            saveBtn.style.background = '#fff';
            saveBtn.style.color = '#0b59a7';
            saveBtn.style.fontWeight = 'bold';
            saveBtn.style.fontSize = '1em';
            saveBtn.style.cursor = 'pointer';
            saveBtn.style.transition = 'background 0.2s, color 0.2s';
            saveBtn.onmouseover = function() {
                saveBtn.style.background = '#0b59a7';
                saveBtn.style.color = '#fff';
            };
            saveBtn.onmouseout = function() {
                saveBtn.style.background = '#fff';
                saveBtn.style.color = '#0b59a7';
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
            cancelBtn.style.color = '#0b59a7';
            cancelBtn.style.fontWeight = 'bold';
            cancelBtn.style.fontSize = '1em';
            cancelBtn.style.cursor = 'pointer';
            cancelBtn.style.transition = 'background 0.2s, color 0.2s';
            cancelBtn.onmouseover = function() {
                cancelBtn.style.background = '#0b59a7';
                cancelBtn.style.color = '#fff';
            };
            cancelBtn.onmouseout = function() {
                cancelBtn.style.background = '#fff';
                cancelBtn.style.color = '#0b59a7';
            };
            cancelBtn.onclick = function() {
                document.body.removeChild(overlay);
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
                // Use mammoth.js to extract text from docx
                readDocxFileLineByLine(file);
                
            }else if(fileName.endsWith('.odt')){
                console.log('Reading ODT file:', file);
                readOdtFileLineByLine(file);

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
