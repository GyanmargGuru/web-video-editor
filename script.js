document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const previewVideo = document.getElementById('preview-video');
    const previewCanvas = document.getElementById('preview-canvas');
    const previewAudio = document.getElementById('preview-audio');
    const ctx = previewCanvas.getContext('2d');

    const imageInput = document.getElementById('image-input');
    const videoInput = document.getElementById('video-input');
    const audioInput = document.getElementById('audio-input');
    const addTextButton = document.getElementById('add-text-btn');

    const timelineTracksContainer = document.getElementById('timeline-tracks');
    const timelineRuler = document.getElementById('timeline-ruler');
    const playhead = document.getElementById('playhead');
    const timelineScrollContainer = document.getElementById('timeline-scroll-container');

    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnStop = document.getElementById('btn-stop');
    const btnToStart = document.getElementById('btn-to-start');
    const timeDisplay = document.getElementById('time-display');

    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomFitBtn = document.getElementById('zoom-fit-btn');

    const exportVideoBtn = document.getElementById('export-video-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const helpBtn = document.getElementById('help-btn');
    const newProjectBtn = document.getElementById('new-project-btn');

    // --- Popups ---
    const textPopup = document.getElementById('text-popup');
    const textInput = document.getElementById('text-input');
    const confirmAddTextBtn = document.getElementById('confirm-add-text');
    const cancelAddTextBtn = document.getElementById('cancel-add-text');
    const deleteTextBtn = document.getElementById('delete-text-btn');
    const textFontSizeInput = document.getElementById('text-font-size');
    const textStartTimeInput = document.getElementById('text-start-time');
    const textDurationInput = document.getElementById('text-duration');
    const textAlignGroupH = document.getElementById('text-align-group-h');
    const textAlignGroupV = document.getElementById('text-align-group-v');

    const imagePopup = document.getElementById('image-popup');
    const confirmEditImageBtn = document.getElementById('confirm-edit-image');
    const cancelEditImageBtn = document.getElementById('cancel-edit-image');
    const deleteImageBtn = document.getElementById('delete-image-btn');
    const imageScaleInput = document.getElementById('image-scale');
    const imageXPosInput = document.getElementById('image-x-pos');
    const imageYPosInput = document.getElementById('image-y-pos');
    const imageStartTimeInput = document.getElementById('image-start-time');
    const imageDurationInput = document.getElementById('image-duration');
    const imgAlignHCenter = document.getElementById('img-align-h-center');
    const imgAlignVMiddle = document.getElementById('img-align-v-middle');

    const mediaPopup = document.getElementById('media-popup');
    const confirmEditMediaBtn = document.getElementById('confirm-edit-media');
    const cancelEditMediaBtn = document.getElementById('cancel-edit-media');
    const deleteMediaBtn = document.getElementById('delete-media-btn');
    const mediaStartTimeInput = document.getElementById('media-start-time');
    const mediaDurationInput = document.getElementById('media-duration');

    // --- App State ---
    // Reordered Tracks: Text (Top), Image, Video, Audio (Bottom)
    let tracks = [
        { id: 'text_track', type: 'overlay', label: 'Text', items: [] },
        { id: 'image_track', type: 'overlay', label: 'Image', items: [] },
        { id: 'video_track', type: 'video', label: 'Video', items: [] },
        { id: 'audio_track', type: 'audio', label: 'Audio', items: [] }
    ];

    let currentTime = 0; // in seconds
    let totalDuration = 30; // default duration, will auto-adjust
    let isPlaying = false;
    let pixelsPerSecond = 20;
    let animationFrameId = null;
    let lastTimestamp = 0;

    // Dragging State
    let isDraggingPlayhead = false;
    let draggedClip = null;
    let dragStartX = 0;
    let originalClipStart = 0;

    // FFmpeg
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true, corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js' });

    // --- Initialization ---
    const init = () => {
        resizeCanvas();
        renderTimeline();
        updatePlayhead();
        window.addEventListener('resize', resizeCanvas);

        // Helper for alignment buttons
        setupAlignButtons(textAlignGroupH);
        setupAlignButtons(textAlignGroupV);

        // Load and show placeholder image on startup
        const placeholder = new Image();
        placeholder.src = 'placeholder.png';
        placeholder.onload = () => {
            // Only draw if the canvas is still empty (no tracks added yet)
            if (tracks.every(t => t.items.length === 0)) {
                ctx.drawImage(placeholder, 0, 0, 1280, 720);
            }
        };
    };

    const setupAlignButtons = (group) => {
        group.addEventListener('click', (e) => {
            if (e.target.matches('.align-btn')) {
                group.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
            }
        });
    };

    const resizeCanvas = () => {
        // Canvas resolution is fixed at 1280x720 for high quality.
        // CSS handles the display size.
    };

    // --- Auto-Fit Duration ---
    const updateTotalDuration = () => {
        let maxEnd = 0;
        tracks.forEach(track => {
            track.items.forEach(item => {
                const end = item.start + item.duration;
                if (end > maxEnd) maxEnd = end;
            });
        });
        // Minimum 10 seconds, or max end time + small buffer (optional, user said NO blank space, but a little buffer is good for UI. Let's do exact fit but min 10s)
        totalDuration = Math.max(10, maxEnd);
    };

    // --- Timeline Rendering ---
    const renderTimeline = () => {
        updateTotalDuration(); // Ensure duration is correct before rendering

        // 1. Render Ruler
        timelineRuler.innerHTML = '';
        const rulerWidth = totalDuration * pixelsPerSecond;
        timelineRuler.style.width = `${rulerWidth}px`;

        for (let i = 0; i <= totalDuration; i += 1) { // Mark every second
            const mark = document.createElement('div');
            mark.style.position = 'absolute';
            mark.style.left = `${i * pixelsPerSecond}px`;
            mark.style.height = '100%';
            mark.style.borderLeft = '1px solid #555';
            mark.style.fontSize = '10px';
            mark.style.paddingLeft = '2px';
            mark.style.color = '#888';
            if (i % 5 === 0) {
                mark.textContent = formatTime(i);
                mark.style.borderLeft = '1px solid #aaa';
            }
            timelineRuler.appendChild(mark);
        }

        // 2. Render Headers & Tracks
        const timelineHeaders = document.getElementById('timeline-headers');
        timelineHeaders.innerHTML = '';
        timelineTracksContainer.innerHTML = '';

        tracks.forEach(track => {
            // Header
            const headerEl = document.createElement('div');
            headerEl.className = 'track-label';
            headerEl.textContent = track.label;
            timelineHeaders.appendChild(headerEl);

            // Track
            const trackEl = document.createElement('div');
            trackEl.className = 'track';
            trackEl.dataset.trackId = track.id;
            trackEl.style.width = `${Math.max(rulerWidth, timelineScrollContainer.clientWidth)}px`;

            track.items.forEach(item => {
                const clipEl = document.createElement('div');
                clipEl.className = `clip ${item.type}-clip`;
                clipEl.style.left = `${item.start * pixelsPerSecond}px`;
                clipEl.style.width = `${item.duration * pixelsPerSecond}px`;
                clipEl.textContent = item.name;
                clipEl.dataset.itemId = item.id;
                clipEl.title = item.name;

                // Clip Interaction
                clipEl.addEventListener('mousedown', (e) => startDragClip(e, item, track));
                clipEl.addEventListener('dblclick', (e) => editClipProperties(item));

                trackEl.appendChild(clipEl);
            });

            timelineTracksContainer.appendChild(trackEl);
        });
    };

    const updatePlayhead = () => {
        playhead.style.left = `${currentTime * pixelsPerSecond}px`;
        timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(totalDuration)}`;

        // Auto-scroll if playhead moves out of view
        const containerWidth = timelineScrollContainer.clientWidth;
        const scrollLeft = timelineScrollContainer.scrollLeft;
        const playheadPos = currentTime * pixelsPerSecond;

        if (playheadPos > scrollLeft + containerWidth - 50) {
            timelineScrollContainer.scrollLeft = playheadPos - 50;
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // --- Preview Engine ---
    const renderFrame = () => {
        // 1. Handle Base Video
        const videoTrack = tracks.find(t => t.id === 'video_track');
        const activeVideoClip = videoTrack.items.find(item => currentTime >= item.start && currentTime < item.start + item.duration);

        if (activeVideoClip) {
            if (previewVideo.src !== activeVideoClip.src) {
                previewVideo.src = activeVideoClip.src;
            }

            // Sync video time
            const timeInClip = currentTime - activeVideoClip.start;
            if (Math.abs(previewVideo.currentTime - timeInClip) > 0.3) {
                previewVideo.currentTime = timeInClip;
            }
            if (isPlaying && previewVideo.paused) previewVideo.play();
            if (!isPlaying && !previewVideo.paused) previewVideo.pause();

            previewVideo.style.display = 'block';
        } else {
            previewVideo.style.display = 'none';
            previewVideo.pause();
        }

        // 2. Handle Audio
        const audioTrack = tracks.find(t => t.id === 'audio_track');
        const activeAudioClip = audioTrack.items.find(item => currentTime >= item.start && currentTime < item.start + item.duration);

        if (activeAudioClip) {
            if (previewAudio.src !== activeAudioClip.src) {
                previewAudio.src = activeAudioClip.src;
            }
            const timeInAudio = currentTime - activeAudioClip.start;
            if (Math.abs(previewAudio.currentTime - timeInAudio) > 0.3) {
                previewAudio.currentTime = timeInAudio;
            }
            if (isPlaying && previewAudio.paused) previewAudio.play();
            if (!isPlaying && !previewAudio.paused) previewAudio.pause();
        } else {
            previewAudio.pause();
        }


        // 3. Handle Overlays (Images & Text) on Canvas
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

        // FIX: Render Image Track FIRST, then Text Track so Text is on top
        const imageTrack = tracks.find(t => t.id === 'image_track');
        const textTrack = tracks.find(t => t.id === 'text_track');

        const activeImages = imageTrack.items.filter(item => currentTime >= item.start && currentTime < item.start + item.duration);
        const activeTexts = textTrack.items.filter(item => currentTime >= item.start && currentTime < item.start + item.duration);

        // Draw Images
        activeImages.forEach(item => {
            if (item.imgElement && item.imgElement.complete) {
                const scale = item.properties.scale / 100;
                const w = item.imgElement.width * scale;
                const h = item.imgElement.height * scale;
                // Simple positioning relative to canvas size
                // Assuming x/y are pixels in 1280x720 space, scale to canvas
                const canvasScaleX = previewCanvas.width / 1280;
                const canvasScaleY = previewCanvas.height / 720;

                // Use uniform scaling to prevent distortion
                const scaleFactor = Math.min(canvasScaleX, canvasScaleY);

                // Draw image with uniform scaling
                ctx.drawImage(
                    item.imgElement,
                    item.properties.x * canvasScaleX,
                    item.properties.y * canvasScaleY,
                    w * scaleFactor, // Use uniform scale for width
                    h * scaleFactor  // Use uniform scale for height
                );
            }
        });

        // Draw Text
        activeTexts.forEach(item => {
            const fontSize = item.properties.fontSize * (previewCanvas.width / 1280);
            ctx.font = `${fontSize}px Roboto, Arial`;
            ctx.fillStyle = 'white';
            ctx.textAlign = item.properties.alignH || 'center';
            ctx.textBaseline = item.properties.alignV || 'middle';

            const lines = item.properties.content.split('\n');
            const lineHeight = fontSize * 1.2;
            const totalHeight = lines.length * lineHeight;

            let x = 0;
            if (ctx.textAlign === 'left') x = 20;
            else if (ctx.textAlign === 'center') x = previewCanvas.width / 2;
            else if (ctx.textAlign === 'right') x = previewCanvas.width - 20;

            let y = 0;
            if (ctx.textBaseline === 'top') y = 20 + (lineHeight / 2); // Offset for first line center
            else if (ctx.textBaseline === 'middle') y = (previewCanvas.height - totalHeight) / 2 + (lineHeight / 2);
            else if (ctx.textBaseline === 'bottom') y = previewCanvas.height - 20 - totalHeight + (lineHeight / 2);

            // Adjust y based on baseline being 'middle' for each line
            // Actually, it's easier to set textBaseline to 'middle' and calculate y for each line
            ctx.textBaseline = 'middle';

            lines.forEach((line, index) => {
                ctx.fillText(line, x, y + (index * lineHeight));
            });
        });
    };

    const loop = (timestamp) => {
        if (!isPlaying) return;

        const dt = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;

        if (dt < 0.5) { // Prevent huge jumps
            currentTime += dt;
            if (currentTime >= totalDuration) {
                currentTime = totalDuration;
                pause();
            }
        }

        updatePlayhead();
        renderFrame();

        if (isPlaying) {
            animationFrameId = requestAnimationFrame(loop);
        }
    };

    // --- Playback Controls ---
    const play = () => {
        if (isPlaying) return;
        resizeCanvas(); // Ensure canvas size is correct before playing
        isPlaying = true;
        lastTimestamp = performance.now();
        btnPlayPause.textContent = '⏸︎';
        loop(lastTimestamp);
    };

    const pause = () => {
        isPlaying = false;
        btnPlayPause.textContent = '▶';
        cancelAnimationFrame(animationFrameId);
        previewVideo.pause();
        previewAudio.pause();
    };

    btnPlayPause.addEventListener('click', () => isPlaying ? pause() : play());
    btnStop.addEventListener('click', () => { pause(); currentTime = 0; updatePlayhead(); renderFrame(); });
    btnToStart.addEventListener('click', () => { currentTime = 0; updatePlayhead(); renderFrame(); });

    // --- Timeline Interaction ---
    timelineRuler.addEventListener('mousedown', (e) => {
        isDraggingPlayhead = true;
        const rect = timelineRuler.getBoundingClientRect();
        const x = e.clientX - rect.left + timelineScrollContainer.scrollLeft;
        currentTime = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration));
        updatePlayhead();
        renderFrame();
    });

    document.addEventListener('mousemove', (e) => {
        if (isDraggingPlayhead) {
            const rect = timelineRuler.getBoundingClientRect();
            const x = e.clientX - rect.left + timelineScrollContainer.scrollLeft;
            currentTime = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration));
            updatePlayhead();
            renderFrame();
        }

        if (draggedClip) {
            const deltaX = e.clientX - dragStartX;
            const deltaSeconds = deltaX / pixelsPerSecond;
            let newStart = originalClipStart + deltaSeconds;
            newStart = Math.max(0, newStart); // No negative time

            draggedClip.item.start = newStart;
            renderTimeline(); // Re-render to show movement
        }
    });

    document.addEventListener('mouseup', () => {
        isDraggingPlayhead = false;
        draggedClip = null;
    });

    const startDragClip = (e, item, track) => {
        e.stopPropagation(); // Prevent playhead seek
        draggedClip = { item, track };
        dragStartX = e.clientX;
        originalClipStart = item.start;
    };

    // --- Help Button ---
    helpBtn.addEventListener('click', () => {
        window.open('help.html', '_blank');
    });

    // --- Zoom Controls ---
    zoomInBtn.addEventListener('click', () => { pixelsPerSecond *= 1.5; renderTimeline(); updatePlayhead(); });
    zoomOutBtn.addEventListener('click', () => { pixelsPerSecond /= 1.5; renderTimeline(); updatePlayhead(); });
    zoomFitBtn.addEventListener('click', () => {
        // Fit totalDuration into container width
        const width = timelineScrollContainer.clientWidth;
        pixelsPerSecond = width / totalDuration;
        renderTimeline();
        updatePlayhead();
    });

    // --- Adding Media ---
    const addItemToTrack = (trackId, item) => {
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            // Find first available spot or just append
            const lastItem = track.items[track.items.length - 1];
            item.start = lastItem ? lastItem.start + lastItem.duration : 0;
            track.items.push(item);

            renderTimeline();
            renderFrame(); // Update preview
        }
    };

    videoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        // Get duration (approximate or load metadata)
        const video = document.createElement('video');
        video.src = url;
        video.onloadedmetadata = () => {
            addItemToTrack('video_track', {
                id: Date.now(),
                type: 'video',
                name: file.name,
                file: file,
                src: url,
                duration: video.duration,
                start: 0
            });
        };
    });

    audioInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const audio = document.createElement('audio');
        audio.src = url;
        audio.onloadedmetadata = () => {
            addItemToTrack('audio_track', {
                id: Date.now(),
                type: 'audio',
                name: file.name,
                file: file,
                src: url,
                duration: audio.duration,
                start: 0
            });
        };
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
            addItemToTrack('image_track', {
                id: Date.now(),
                type: 'image',
                name: file.name,
                file: file,
                imgElement: img,
                duration: 5,
                start: 0,
                properties: { x: 10, y: 10, scale: 100 }
            });
        };
    });

    // --- Text & Image Editing ---
    let editingItem = null;

    addTextButton.addEventListener('click', () => {
        editingItem = null;
        textInput.value = '';
        textStartTimeInput.value = 0;
        textDurationInput.value = 5;
        deleteTextBtn.style.display = 'none'; // Hide delete for new items
        textPopup.style.display = 'flex';
    });

    confirmAddTextBtn.addEventListener('click', () => {
        const content = textInput.value;
        if (!content) return;

        const start = parseFloat(textStartTimeInput.value);
        const duration = parseFloat(textDurationInput.value);

        if (editingItem) {
            editingItem.properties.content = content;
            editingItem.properties.fontSize = parseInt(textFontSizeInput.value);
            editingItem.properties.alignH = textAlignGroupH.querySelector('.active').dataset.align;
            editingItem.properties.alignV = textAlignGroupV.querySelector('.active').dataset.align;
            editingItem.start = start;
            editingItem.duration = duration;
            editingItem.name = content.substring(0, 10) + '...';
        } else {
            addItemToTrack('text_track', {
                id: Date.now(),
                type: 'text',
                name: content.substring(0, 10) + '...',
                duration: duration,
                start: start,
                properties: {
                    content: content,
                    fontSize: parseInt(textFontSizeInput.value),
                    alignH: textAlignGroupH.querySelector('.active').dataset.align,
                    alignV: textAlignGroupV.querySelector('.active').dataset.align
                }
            });
        }
        textPopup.style.display = 'none';
        renderTimeline();
        renderFrame();
    });

    cancelAddTextBtn.addEventListener('click', () => textPopup.style.display = 'none');

    // --- Re-link Logic ---
    const imageRelinkGroup = document.getElementById('image-relink-group');
    const imageCurrentName = document.getElementById('image-current-name');
    const relinkImageBtn = document.getElementById('relink-image-btn');
    const relinkImageInput = document.getElementById('relink-image-input');

    const mediaRelinkGroup = document.getElementById('media-relink-group');
    const mediaCurrentName = document.getElementById('media-current-name');
    const relinkMediaBtn = document.getElementById('relink-media-btn');
    const relinkMediaInput = document.getElementById('relink-media-input');

    relinkImageBtn.addEventListener('click', () => relinkImageInput.click());
    relinkMediaBtn.addEventListener('click', () => relinkMediaInput.click());

    relinkImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && editingItem) {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.src = url;
            img.onload = () => {
                editingItem.file = file;
                editingItem.imgElement = img;
                editingItem.isMissing = false;
                editingItem.fileName = file.name; // Update filename
                editingItem.name = file.name; // Update display name
                imageCurrentName.textContent = file.name;
                // imageRelinkGroup.style.display = 'none'; // Keep visible
                renderTimeline();
                renderFrame();
            };
        }
    });

    relinkMediaInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && editingItem) {
            const url = URL.createObjectURL(file);
            // Update based on type
            if (editingItem.type === 'video') {
                const video = document.createElement('video');
                video.src = url;
                video.onloadedmetadata = () => {
                    editingItem.file = file;
                    editingItem.src = url;
                    editingItem.isMissing = false;
                    editingItem.fileName = file.name;
                    editingItem.name = file.name; // Update display name
                    mediaCurrentName.textContent = file.name;
                    // mediaRelinkGroup.style.display = 'none'; // Keep visible
                    renderTimeline();
                    renderFrame();
                };
            } else if (editingItem.type === 'audio') {
                const audio = document.createElement('audio');
                audio.src = url;
                audio.onloadedmetadata = () => {
                    editingItem.file = file;
                    editingItem.src = url;
                    editingItem.isMissing = false;
                    editingItem.fileName = file.name;
                    editingItem.name = file.name; // Update display name
                    mediaCurrentName.textContent = file.name;
                    // mediaRelinkGroup.style.display = 'none'; // Keep visible
                    renderTimeline();
                    renderFrame();
                };
            }
        }
    });

    const editClipProperties = (item) => {
        editingItem = item;
        if (item.type === 'text') {
            textInput.value = item.properties.content;
            textFontSizeInput.value = item.properties.fontSize;
            textStartTimeInput.value = item.start;
            textDurationInput.value = item.duration;
            deleteTextBtn.style.display = 'block';
            // Set align active... (simplified for brevity, ideally should update UI state)
            textPopup.style.display = 'flex';
        } else if (item.type === 'image') {
            imageScaleInput.value = item.properties.scale;
            imageXPosInput.value = item.properties.x;
            imageYPosInput.value = item.properties.y;
            imageStartTimeInput.value = item.start;
            imageDurationInput.value = item.duration;
            deleteImageBtn.style.display = 'block';

            // Always show current file
            imageCurrentName.textContent = item.fileName || item.name || 'Unknown';
            if (item.isMissing) {
                imageCurrentName.style.color = '#ff5252';
                imageCurrentName.textContent += ' (Missing)';
            } else {
                imageCurrentName.style.color = '#fff';
            }
            imageRelinkGroup.style.display = 'block'; // Always show relink options for images

            imagePopup.style.display = 'flex';
        } else if (item.type === 'video' || item.type === 'audio') {
            mediaStartTimeInput.value = item.start;
            mediaDurationInput.value = item.duration;
            deleteMediaBtn.style.display = 'block';

            // Set correct file type filter
            if (item.type === 'video') {
                relinkMediaInput.accept = 'video/*';
            } else {
                relinkMediaInput.accept = 'audio/*';
            }

            // Always show current file
            mediaCurrentName.textContent = item.fileName || item.name || 'Unknown';
            if (item.isMissing) {
                mediaCurrentName.style.color = '#ff5252';
                mediaCurrentName.textContent += ' (Missing)';
            } else {
                mediaCurrentName.style.color = '#fff';
            }
            mediaRelinkGroup.style.display = 'block'; // Always show relink options for media

            mediaPopup.style.display = 'flex';
        }
    };

    confirmEditImageBtn.addEventListener('click', () => {
        if (editingItem && editingItem.type === 'image') {
            editingItem.properties.scale = parseInt(imageScaleInput.value);
            editingItem.properties.x = parseInt(imageXPosInput.value);
            editingItem.properties.y = parseInt(imageYPosInput.value);
            editingItem.start = parseFloat(imageStartTimeInput.value);
            editingItem.duration = parseFloat(imageDurationInput.value);
            renderTimeline();
            renderFrame();
        }
        imagePopup.style.display = 'none';
    });

    cancelEditImageBtn.addEventListener('click', () => imagePopup.style.display = 'none');

    // Image Quick Align
    imgAlignHCenter.addEventListener('click', () => {
        if (editingItem && editingItem.type === 'image') {
            // Calculate Center X: (1280 - (imgW * scale))/2
            const scale = editingItem.properties.scale / 100;
            const w = editingItem.imgElement.width * scale;
            const x = (1280 - w) / 2;
            imageXPosInput.value = Math.round(x);
        }
    });

    imgAlignVMiddle.addEventListener('click', () => {
        if (editingItem && editingItem.type === 'image') {
            // Calculate Middle Y: (720 - (imgH * scale))/2
            const scale = editingItem.properties.scale / 100;
            const h = editingItem.imgElement.height * scale;
            const y = (720 - h) / 2;
            imageYPosInput.value = Math.round(y);
        }
    });

    // Media (Video/Audio) Edit
    confirmEditMediaBtn.addEventListener('click', () => {
        if (editingItem && (editingItem.type === 'video' || editingItem.type === 'audio')) {
            editingItem.start = parseFloat(mediaStartTimeInput.value);
            editingItem.duration = parseFloat(mediaDurationInput.value);
            renderTimeline();
            renderFrame();
        }
        mediaPopup.style.display = 'none';
    });

    cancelEditMediaBtn.addEventListener('click', () => mediaPopup.style.display = 'none');

    // --- Delete Logic ---
    const deleteItem = (item) => {
        if (!item) return;

        tracks.forEach(track => {
            const idx = track.items.indexOf(item);
            if (idx > -1) {
                track.items.splice(idx, 1);
            }
        });

        renderTimeline();
        renderFrame();
    };

    deleteTextBtn.addEventListener('click', () => {
        deleteItem(editingItem);
        textPopup.style.display = 'none';
    });

    deleteImageBtn.addEventListener('click', () => {
        deleteItem(editingItem);
        imagePopup.style.display = 'none';
    });

    deleteMediaBtn.addEventListener('click', () => {
        deleteItem(editingItem);
        mediaPopup.style.display = 'none';
    });

    // --- Save/Load Project ---
    const saveProjectBtn = document.getElementById('save-project-btn');
    const loadProjectInput = document.getElementById('load-project-input');

    saveProjectBtn.addEventListener('click', () => {
        const projectData = {
            version: 1,
            totalDuration: totalDuration,
            tracks: tracks.map(track => ({
                ...track,
                items: track.items.map(item => {
                    // Create a clean copy of the item for saving
                    const cleanItem = {
                        id: item.id,
                        type: item.type,
                        name: item.name,
                        start: item.start,
                        duration: item.duration,
                        properties: { ...item.properties } // Deep copy properties
                    };
                    // We cannot save File objects or Blob URLs
                    // We store the filename to help user identify missing media later
                    if (item.file) {
                        cleanItem.fileName = item.file.name;
                    }
                    return cleanItem;
                })
            }))
        };

        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
        a.download = `video-project-${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    loadProjectInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const projectData = JSON.parse(event.target.result);

                // Basic validation
                if (!projectData.tracks || !Array.isArray(projectData.tracks)) {
                    throw new Error("Invalid project file format");
                }

                // Restore State
                totalDuration = projectData.totalDuration || 30;

                // Reconstruct tracks
                tracks = projectData.tracks.map(savedTrack => ({
                    ...savedTrack,
                    items: savedTrack.items.map(savedItem => {
                        const item = { ...savedItem };

                        // Re-initialize runtime properties
                        if (item.type === 'image') {
                            // Image needs an imgElement to render
                            // Since we don't have the file, we create a placeholder or mark it
                            item.imgElement = new Image();
                            // We can't set src yet. It will be broken.
                            // Ideally we'd show a "Missing Media" placeholder
                            item.isMissing = true;
                        } else if (item.type === 'video' || item.type === 'audio') {
                            item.isMissing = true;
                        }

                        return item;
                    })
                }));

                // Reset UI
                currentTime = 0;
                renderTimeline();
                updatePlayhead();
                renderFrame();

                alert("Project loaded successfully! Note: Media files (Video, Audio, Images) cannot be saved in the project file. You may need to re-add them.");

            } catch (err) {
                console.error(err);
                alert("Failed to load project: " + err.message);
            }
        };
        reader.readAsText(file);

        // Reset input so same file can be loaded again if needed
        e.target.value = '';
    });

    // --- Export Logic (FFmpeg) ---
    exportVideoBtn.addEventListener('click', async () => {
        if (!ffmpeg.isLoaded()) await ffmpeg.load();

        loadingIndicator.style.display = 'flex';

        try {
            // 1. Write files to FFmpeg FS
            const allItems = tracks.flatMap(t => t.items);
            for (const item of allItems) {
                if (item.file) {
                    ffmpeg.FS('writeFile', item.file.name, await fetchFile(item.file));
                }
            }
            try {
                ffmpeg.FS('writeFile', 'font.ttf', await fetchFile('Roboto-Regular.ttf'));
            } catch (e) { console.warn("Font not found"); }

            // 2. Build Filter Complex
            let inputs = [];
            let filterComplex = [];
            let inputIndex = 0;
            let videoChain = null;

            // Input 0: Always Black Background (Base Canvas)
            inputs.push('-f', 'lavfi', '-i', `color=c=black:s=1280x720:d=${totalDuration}`);
            let bgIndex = inputIndex++;
            videoChain = `[${bgIndex}:v]`;

            // Find base video
            const videoTrack = tracks.find(t => t.id === 'video_track');
            const baseVideo = videoTrack.items[0]; // Support multiple later

            let videoAudioChain = null;

            if (baseVideo) {
                inputs.push('-i', baseVideo.file.name);
                let vidIdx = inputIndex++;

                // Shift Video Start Time
                // setpts=PTS-STARTPTS+START_TIME/TB
                // This resets the video timestamp to 0 and adds the start offset
                filterComplex.push(`[${vidIdx}:v]setpts=PTS-STARTPTS+${baseVideo.start}/TB[v_shifted]`);

                // Overlay on Black Background
                filterComplex.push(`[${bgIndex}:v][v_shifted]overlay=0:0:eof_action=pass[v_base]`);
                videoChain = '[v_base]';

                // Handle Video's Audio (if any)
                // We assume video has audio. If not, this might fail or produce silent stream.
                // Ideally we probe, but for now we assume.
                // Delay audio to match video start
                const delay = Math.round(baseVideo.start * 1000);
                filterComplex.push(`[${vidIdx}:a]adelay=${delay}|${delay}[a_video_delayed]`);
                videoAudioChain = '[a_video_delayed]';
            }

            // Process Audio Track
            const audioTrack = tracks.find(t => t.id === 'audio_track');
            const audioItems = audioTrack.items;
            let audioTrackChain = null;

            if (audioItems.length > 0) {
                const audioItem = audioItems[0];
                inputs.push('-i', audioItem.file.name);
                const delay = Math.round(audioItem.start * 1000);
                const audioIdx = inputIndex++;
                filterComplex.push(`[${audioIdx}:a]adelay=${delay}|${delay}[a_track_delayed]`);
                audioTrackChain = '[a_track_delayed]';
            }

            // Mix Audio Streams
            let audioChain = null;
            if (videoAudioChain && audioTrackChain) {
                filterComplex.push(`${videoAudioChain}${audioTrackChain}amix=inputs=2[a_out]`);
                audioChain = '[a_out]';
            } else if (videoAudioChain) {
                audioChain = videoAudioChain;
            } else if (audioTrackChain) {
                audioChain = audioTrackChain;
            }

            // Process Overlays (Images & Text)
            // Sort all overlay items by start time
            const overlayItems = tracks.filter(t => t.type === 'overlay').flatMap(t => t.items).sort((a, b) => a.start - b.start);

            overlayItems.forEach((item, idx) => {
                const outLabel = `[v${idx}]`;

                if (item.type === 'image') {
                    inputs.push('-i', item.file.name);
                    const imgIdx = inputIndex++;
                    const scale = item.properties.scale / 100;

                    // Scale and Overlay
                    filterComplex.push(`[${imgIdx}:v]scale=iw*${scale}:-1[img${idx}]`);
                    filterComplex.push(`${videoChain}[img${idx}]overlay=${item.properties.x}:${item.properties.y}:enable='between(t,${item.start},${item.start + item.duration})'${outLabel}`);
                } else if (item.type === 'text') {
                    // Use textfile to handle newlines and special characters reliably
                    const textFileName = `text_${idx}.txt`;
                    ffmpeg.FS('writeFile', textFileName, item.properties.content);

                    let xExpr = '(w-text_w)/2';
                    if (item.properties.alignH === 'left') xExpr = '20';
                    if (item.properties.alignH === 'right') xExpr = 'w-text_w-20';

                    let yExpr = '(h-text_h)/2';
                    if (item.properties.alignV === 'top') yExpr = '20';
                    if (item.properties.alignV === 'bottom') yExpr = 'h-text_h-20';

                    // Use textfile instead of text='...'
                    // Note: We still need to escape the filename if it had weird chars, but text_${idx}.txt is safe.
                    // We also add line_spacing just in case.
                    filterComplex.push(`${videoChain}drawtext=fontfile=font.ttf:textfile=${textFileName}:fontsize=${item.properties.fontSize}:fontcolor=white:x=${xExpr}:y=${yExpr}:line_spacing=10:enable='between(t,${item.start},${item.start + item.duration})'${outLabel}`);
                }

                videoChain = outLabel;
            });

            const command = [
                ...inputs,
                '-filter_complex', filterComplex.join(';') || 'null',
                '-map', videoChain,
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-t', totalDuration.toString(),
                'output.mp4'
            ];

            if (audioChain) {
                command.splice(command.length - 1, 0, '-map', audioChain);
            }

            // Remove filter_complex if empty
            if (filterComplex.length === 0) {
                const idx = command.indexOf('-filter_complex');
                if (idx > -1) command.splice(idx, 2);
            }

            console.log("FFmpeg Command:", command);
            await ffmpeg.run(...command);

            const data = ffmpeg.FS('readFile', 'output.mp4');
            const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));

            const a = document.createElement('a');
            a.href = url;
            a.download = 'export.mp4';
            a.click();

        } catch (e) {
            console.error(e);
            alert("Export failed. See console.");
        } finally {
            loadingIndicator.style.display = 'none';
        }
    });

    // --- New Project Button ---
    newProjectBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to start a new project? Any unsaved changes will be lost.")) {
            location.reload();
        }
    });

    init();
});