<?php
    // Send the required headers for SharedArrayBuffer
    header("Cross-Origin-Opener-Policy: same-origin");
    header("Cross-Origin-Embedder-Policy: require-corp");
  	// include "../com/utils.php";
	$l_sitever = "0.2.0";
	$count_serv = "ve";
	include "../com/count.php";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=0.8">
    <title>Simple Video Editor</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="app-container">
        <!-- ... (no changes to the main app layout) ... -->
        <div class="header">
            <h2>🎬 Simple Video Editor</h2><p class="tiny-text">Beta</p>
            <button id="help-btn" class="help-button" title="Help">❓</button>
        </div>

        <div class="preview-container">
            <div class="preview-stage">
                <div class="video-wrapper">
                    <video id="preview-video" class="preview-element"></video>
                    <canvas id="preview-canvas" class="preview-element" width="1280" height="720"></canvas>
                    <audio id="preview-audio" style="display: none;"></audio>
                </div>
            </div>
            <div id="loading-indicator" class="loading-indicator" style="display: none;">
                <p>Processing... Please wait.</p>
                <div class="spinner"></div>
            </div>
            <div class="playback-controls">
                <button id="btn-to-start" class="control-icon" title="Go to Start">⏮</button>
                <button id="btn-play-pause" class="control-icon" title="Play/Pause">▶</button>
                <button id="btn-stop" class="control-icon" title="Stop">■</button>
                <span id="time-display">00:00 / 00:00</span>
            </div>
        </div>

        <div class="actions-container">
            <button id="add-text-btn" class="action-button add-media">Add Text</button>
            <input type="file" id="image-input" accept="image/*" class="file-input">
            <label for="image-input" class="action-button add-media">Add Image</label>
            <input type="file" id="video-input" accept="video/*" class="file-input">
            <label for="video-input" class="action-button add-media">Add Video</label>
            <input type="file" id="audio-input" accept="audio/*" class="file-input">
            <label for="audio-input" class="action-button add-media">Add Audio</label>
        </div>

        <div class="timeline-area">
            <div class="timeline-controls">
                <button id="zoom-out-btn" title="Zoom Out">-</button>
                <button id="zoom-in-btn" title="Zoom In">+</button>
                <button id="zoom-fit-btn" title="Zoom to Fit">Fit</button>
            </div>
            <div class="timeline-main">
                <div class="timeline-headers" id="timeline-headers">
                    <!-- Track headers generated here -->
                </div>
                <div class="timeline-scroll-container" id="timeline-scroll-container">
                    <div class="timeline-ruler" id="timeline-ruler"></div>
                    <div class="timeline-tracks" id="timeline-tracks">
                        <!-- Tracks generated here -->
                    </div>
                    <div class="playhead" id="playhead"></div>
                </div>
            </div>
        </div>

        <div class="actions-container">
            <button id="new-project-btn" class="action-button new-project">New Project</button>
            <button id="save-project-btn" class="action-button save">Save Project</button>
            <input type="file" id="load-project-input" accept=".json" class="file-input">
            <label for="load-project-input" class="action-button load">Load Project</label>
            <button id="export-video-btn" class="action-button export">Export Video</button>
        </div>
        
        <?php include "footer.php"; ?>
    </div>

    <!-- Text Input Popup -->
    <div id="text-popup" class="popup" style="display: none;">
        <div class="popup-content">
            <h3>Edit Text Properties</h3>
            <textarea id="text-input" placeholder="Enter your text here..."></textarea>
            <div class="popup-controls">
                <div class="control-group">
                    <label for="text-font-size">Font Size</label>
                    <input type="number" id="text-font-size" value="36" min="10">
                </div>
                <div class="control-group">
                    <label for="text-start-time">Start (sec)</label>
                    <input type="number" id="text-start-time" value="0" min="0" step="0.1">
                </div>
                <div class="control-group">
                    <label for="text-duration">Duration (sec)</label>
                    <input type="number" id="text-duration" value="5" min="0.1" step="0.1">
                </div>
            </div>
            <div class="control-group">
                <label>Horizontal Alignment</label>
                <div id="text-align-group-h" class="align-buttons">
                    <button class="align-btn" data-align="left">Left</button>
                    <button class="align-btn active" data-align="center">Center</button>
                    <button class="align-btn" data-align="right">Right</button>
                </div>
            </div>
            <div class="control-group" style="margin-top: 10px;">
                <label>Vertical Alignment</label>
                <div id="text-align-group-v" class="align-buttons">
                    <button class="align-btn" data-align="top">Top</button>
                    <button class="align-btn active" data-align="middle">Middle</button>
                    <button class="align-btn" data-align="bottom">Bottom</button>
                </div>
            </div>
            <div class="popup-actions">
                <button id="delete-text-btn" class="delete-btn" style="margin-right: auto;">Delete</button>
                <button id="confirm-add-text">Save</button>
                <button id="cancel-add-text">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Image Properties Popup -->
    <div id="image-popup" class="popup" style="display: none;">
        <div class="popup-content">
            <h3>Edit Image Properties</h3>
            <div class="popup-controls">
                <div class="control-group">
                    <label for="image-scale">Scale (%)</label>
                    <input type="number" id="image-scale" value="100" min="10" max="1000">
                </div>
                <div class="control-group">
                    <label for="image-x-pos">X Position</label>
                    <input type="number" id="image-x-pos" value="10">
                </div>
                <div class="control-group">
                    <label for="image-y-pos">Y Position</label>
                    <input type="number" id="image-y-pos" value="10">
                </div>
            </div>
            <div class="control-group" id="image-relink-group">
                <button id="relink-image-btn" class="action-button" style="width: 100%; background: #FF9800; margin-bottom: 5px;">Select / Replace File</button>
                <input type="file" id="relink-image-input" accept="image/*" style="display: none;">
                <label style="font-size: 0.9em; color: #aaa;">Current File: <span id="image-current-name" style="color: #fff;"></span></label>
            </div>
             <div class="popup-controls">
                <div class="control-group">
                    <label for="image-start-time">Start (sec)</label>
                    <input type="number" id="image-start-time" value="0" min="0" step="0.1">
                </div>
                <div class="control-group">
                    <label for="image-duration">Duration (sec)</label>
                    <input type="number" id="image-duration" value="5" min="0.1" step="0.1">
                </div>
            </div>
            <div class="control-group">
                <label>Quick Align</label>
                <div class="align-buttons">
                    <button id="img-align-h-center" class="align-btn">Center H</button>
                    <button id="img-align-v-middle" class="align-btn">Middle V</button>
                </div>
            </div>
            <div class="popup-actions">
                <button id="delete-image-btn" class="delete-btn" style="margin-right: auto;">Delete</button>
                <button id="confirm-edit-image">Save Changes</button>
                <button id="cancel-edit-image">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Video/Audio Properties Popup -->
    <div id="media-popup" class="popup" style="display: none;">
        <div class="popup-content">
            <h3>Edit Media Properties</h3>
             <div class="popup-controls">
                <div class="control-group">
                    <label for="media-start-time">Start (sec)</label>
                    <input type="number" id="media-start-time" value="0" min="0" step="0.1">
                </div>
                <div class="control-group">
                    <label for="media-duration">Duration (sec)</label>
                    <input type="number" id="media-duration" value="5" min="0.1" step="0.1">
                </div>
            </div>
            <div class="control-group" id="media-relink-group">
                <button id="relink-media-btn" class="action-button" style="width: 100%; background: #FF9800; margin-bottom: 5px;">Select / Replace File</button>
                <input type="file" id="relink-media-input" accept="video/*,audio/*" style="display: none;">
                <label style="font-size: 0.9em; color: #aaa;">Current File: <span id="media-current-name" style="color: #fff;"></span></label>
            </div>
            <div class="popup-actions">
                <button id="delete-media-btn" class="delete-btn" style="margin-right: auto;">Delete</button>
                <button id="confirm-edit-media">Save Changes</button>
                <button id="cancel-edit-media">Cancel</button>
            </div>
        </div>
    </div>


    <script src="https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.10.0/dist/ffmpeg.min.js"></script>
    <script src="script.js"></script>
</body>


</html>