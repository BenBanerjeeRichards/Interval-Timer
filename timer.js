var expectedIntervalEnd;
var paused = false;
var remainingMsAtPause;
var schedulePos = 0;
var doFlashBackground = true;
var flashBackgroundInterval;

var COLOR_NORMAL = "black";
var COLOR_PAUSED = "#686868";
var COLOR_NEAR_END = "#ff0000";
var NEAR_END_THRESHOLD_SEC = 6;

var BACKGROUND_COLOR_PRIMARY = "white";
var BACKGROUND_COLOR_SECONDARY = "#8c8c8c";
var FONT_COLOR_PRIMARY = "black";
var FONT_COLOR_SECONDARY = "white";

var SCHEDULE;

var START = {
    "name": "Starting...",
    "duration": [0, 5]
};

function padZero(num) {
    if (num < 10) return "0" + num;
    return num + "";
}

function pause() {
    paused = true;
    remainingMsAtPause = (expectedIntervalEnd - Date.now());
    setTimerColour(COLOR_PAUSED);
    stopFlashingBackground();
}

function reStart() {
    if (!paused) {
        console.warn("Tried to reStart non-paused process, ignoring");
        return;
    }


    expectedIntervalEnd = Date.now() + remainingMsAtPause;
    paused = false;
    setTimerColour(COLOR_NORMAL);
    updateDisplay();
}

function updateDisplay() {
    if (paused) return;

    var deltaSeconds = (expectedIntervalEnd - Date.now()) / 1000;
    deltaSeconds = deltaSeconds < 0 ? 0 : deltaSeconds;
    var minutesRemaining = Math.floor(deltaSeconds / 60);
    var secondsRemaining = Math.floor(deltaSeconds - (minutesRemaining * 60));

    if (deltaSeconds <= NEAR_END_THRESHOLD_SEC) {
        if (flashBackgroundInterval === undefined) startFlashingBackground();
    } else {
        stopFlashingBackground();
    }

    if (deltaSeconds < 0.5) stopFlashingBackground();

    document.getElementById("minute").innerHTML = padZero(minutesRemaining);
    document.getElementById("second").innerHTML = padZero(secondsRemaining);

    if (deltaSeconds <= 0 && ++schedulePos < SCHEDULE.length) {
        setupSection(schedulePos);
    }
}

function currentBackgroundColour() {
    return document.getElementsByTagName("body")[0].style.backgroundColor;
}

function flashBackground() {
    if (currentBackgroundColour() === BACKGROUND_COLOR_PRIMARY) {
        setTimerColour(FONT_COLOR_SECONDARY);
        setBackgroundColor(BACKGROUND_COLOR_SECONDARY);
    } else {
        setTimerColour(FONT_COLOR_PRIMARY);
        setBackgroundColor(BACKGROUND_COLOR_PRIMARY);
    }
}

function startFlashingBackground() {
    flashBackgroundInterval = window.setInterval(flashBackground, 500);
    flashBackground();
    console.log(flashBackgroundInterval)
}

function stopFlashingBackground() {
    if (flashBackgroundInterval === undefined) return;
    setTimerColour(FONT_COLOR_PRIMARY);
    setBackgroundColor(BACKGROUND_COLOR_PRIMARY);
    window.clearInterval(flashBackgroundInterval);
    flashBackgroundInterval = undefined;
}

function setupSection(index) {
    var wasPaused = paused;
    if (paused) {
        reStart();
    }
    var schedule = SCHEDULE[index];
    if (schedule === undefined) {
        console.error("Index " + index + " not in range of schedule length " + SCHEDULE.length);
    }
    var seconds = 60 * schedule.duration[0] + schedule.duration[1];
    expectedIntervalEnd = Date.now() + seconds * 1000;
    document.getElementById("current").innerHTML = schedule.name;

    document.getElementById("next").innerHTML = index == SCHEDULE.length - 1 ?
        "<END>" : SCHEDULE[index + 1].name;

    updateDisplay();
    if (wasPaused) {
        pause()
    }
}

function setTimerColour(color) {
    document.getElementById("timer-container").style.color = color;
}

function setBackgroundColor(color) {
    document.getElementsByTagName("body")[0].style.backgroundColor = color;
}

function enableTimerView() {
    document.getElementById("timer-container").style.display = "block";
    document.getElementById("load-container").style.display = "none";
}

function onFileUploaded(evt) {
    var file = evt.target.files[0];
    var path = evt.target.value;

    var reader = new FileReader();
    reader.onload = function (theFile) {
        return function (e) {
            if (path.endsWith(".csv")) {
                var asJson = parseCsv(e.target.result);
                if (asJson === false) {
                    alert("Bad CSV");
                } else {
                    SCHEDULE = asJson;
                }
            } else {
                SCHEDULE = JSON.parse(e.target.result);
            }

            SCHEDULE.unshift(START);
            console.log(SCHEDULE);

            setupSection(0);
            updateDisplay();
            pause();
            window.setInterval(updateDisplay, 20);
            setBackgroundColor(BACKGROUND_COLOR_PRIMARY);

            enableTimerView();

        }
    }(file);
    reader.readAsText(file);
}

function parseCsv(csv) {
    // Really bad csv parser
    // FIXME use a library
    var asJson = [];
    csv.split(/\r?\n/).forEach(function(line) {
        var parts = line.split(",");
        var lineJson = {};
        if (parts.length !== 0) {
            if (parts.length !== 2) return false;
            var timeParts = parts[0].split(":");
            if (timeParts.length !== 2) return false;
            // TODO parseInt error
            lineJson["duration"]=  [parseInt(timeParts[0]), parseInt(timeParts[1])];
            lineJson["name"] = parts[1];
            asJson.push(lineJson);
        }
    });

    return asJson;
}

window.onload = function () {

    document.getElementById('uploadFile').addEventListener('change', onFileUploaded, false);

    window.addEventListener("keydown", function (event) {
        if (event.key === " ") {
            if (paused) {
                reStart();
            } else {
                pause();
            }
        }

        if (event.key === "ArrowRight" && schedulePos < SCHEDULE.length - 1) {
            setupSection(++schedulePos);
        }

        if (event.key === "ArrowLeft" && schedulePos > 0) {
            setupSection(--schedulePos);
        }
    });
};
