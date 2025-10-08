// const CHECK_IN_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyz7RYoBxvu8-x7ZoxEhOpLTALjWydaK2bNPBCXecQF8WY-f3KZ5pW4J0RHQptHilBrNg/exec';
const CHECK_IN_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzO4VmW7AByNGZoxP7QNbXStdf_Apzr5ruOPZf_Smhage7jQV4p8Mq0NBArVh9DP-po-g/exec';

// const CHECK_OUT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyf70mKCmo47tYLw2DNny9yAg8_-D8CO-fS5L53rMSFrfWcH4D88wmm-gL8nYmV_uyi_A/exec';
const CHECK_OUT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5iruEIXcEYnCNUuFS_LwP9DgrV7C_3esXoAbaXNEv98OkJkURk1yBM5wMiSgtxUXa8g/exec';

async function postAttendance(name, facultyNumber, attendanceType) {
    console.log('postAttendance called with:', name, facultyNumber, attendanceType);
    const sheetScriptUrl = attendanceType === 'joining' ? CHECK_IN_SCRIPT_URL : CHECK_OUT_SCRIPT_URL;
    console.log('Posting to URL:', sheetScriptUrl);
    const data = {
        name: name,
        facultyNumber: facultyNumber,
        action: 'add'
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

document.addEventListener('DOMContentLoaded', function() {

    if(localStorage.getItem('loggedIn') !== 'true') {
        // Not logged in, redirect to login page
        window.location.href = 'index.html';
        return;
    }

    // Go Back button functionality
    const goBackBtn = document.getElementById('goBackBtn');
    if (goBackBtn) {
        goBackBtn.addEventListener('click', function() {
            window.history.back();
        });
    }

    let scanInProgress = false;
	let html5QrCode = null;

    function onScanSuccess(decodedText, decodedResult) {
        if (scanInProgress){
            return;
        } // Prevent duplicate POSTs

        const attendanceType = document.querySelector('input[name="attendanceType"]:checked')?.value;
        console.log('Attendance type:', attendanceType);

        scanInProgress = true;
        // Expecting format: "Иван Иванов Иванов 121222198"
        // Regular expressions to match names and faculty number

        const matchThreeNames = decodedText.match(/^([А-Яа-яЁёA-Za-z]+)\s+([А-Яа-яЁёA-Za-z]+)\s+([А-Яа-яЁёA-Za-z]+)\s+(\d{9})$/);
        const matchTwoNames = decodedText.match(/^([А-Яа-яЁёA-Za-z]+)\s+([А-Яа-яЁёA-Za-z]+)\s+(\d{9})$/);

        if (matchThreeNames) {

            const firstName = matchThreeNames[1];
            const middleName = matchThreeNames[2];
            const lastName = matchThreeNames[3];
            const facultyNumber = matchThreeNames[4];
            console.log(`Extracted: ${firstName}, ${middleName}, ${lastName}, ${facultyNumber}`);

            const qrNameResult = document.getElementById('qr-name-result');
            const qrFacultyNumberResult = document.getElementById('qr-facultyNumber-result');

            qrNameResult.textContent = `${firstName} ${middleName} ${lastName}`;
            qrFacultyNumberResult.textContent = `${facultyNumber}`;

            // Always set color based on attendanceType
            if(attendanceType == 'joining'){
                qrNameResult.style.color = '#0ab10a'; // Green for joining
                qrFacultyNumberResult.style.color = '#0ab10a';
            }else if(attendanceType == 'leaving'){
                qrNameResult.style.color = '#ff0000'; // Red for leaving
                qrFacultyNumberResult.style.color = '#ff0000';
            }

            postAttendance(`${firstName} ${middleName} ${lastName}`, facultyNumber, attendanceType);

        } else if(matchTwoNames){
            const firstName = matchTwoNames[1];
            const lastName = matchTwoNames[2];
            const facultyNumber = matchTwoNames[3];
            console.log(`Extracted: ${firstName}, ${lastName}, ${facultyNumber}`);
            const qrNameResult = document.getElementById('qr-name-result');
            const qrFacultyNumberResult = document.getElementById('qr-facultyNumber-result');
            qrNameResult.textContent = `${firstName} ${lastName}`;
            qrFacultyNumberResult.textContent = `${facultyNumber}`;
            // Always set color based on attendanceType
            if(attendanceType == 'joining'){
                qrNameResult.style.color = '#0ab10a';
                qrFacultyNumberResult.style.color = '#0ab10a';
            }else if(attendanceType == 'leaving'){
                qrNameResult.style.color = '#ff0000';
                qrFacultyNumberResult.style.color = '#ff0000';
            }

            postAttendance(`${firstName} ${lastName}`, facultyNumber, attendanceType);

        }else {
            console.log('No match');
            document.getElementById('qr-result').textContent = 'Invalid QR code data.';
        }

        // Allow scanning again after 1.5 seconds
        setTimeout(() => {
            scanInProgress = false;
            // Clear the result fields after timeout
            const qrNameResult = document.getElementById('qr-name-result');
            const qrFacultyNumberResult = document.getElementById('qr-facultyNumber-result');
            if (qrNameResult) qrNameResult.textContent = '';
            if (qrFacultyNumberResult) qrFacultyNumberResult.textContent = '';
        }, 2500);
    }

    function onScanError(errorMessage) {
        // Optionally handle scan errors
    }

    function startScanner() {
        if (window.Html5Qrcode) {
            const qrReaderDiv = document.getElementById('qr-reader');
            if (!qrReaderDiv) {
                return;
            }
            html5QrCode = new Html5Qrcode("qr-reader");
            html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 30, // Higher FPS for faster scanning
                    qrbox: { width: 200, height: 200 }, // Smaller box for quicker detection
                    aspectRatio: 1.0, // Square box
                    disableFlip: true // Try both orientations
                },
                onScanSuccess,
                onScanError
            );
        } else {
            setTimeout(startScanner, 200);
        }
    }
    startScanner();

});