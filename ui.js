/**
 * MusicPad UI Components
 * Provides UI elements and controls for the recording system
 */

class MusicPadUI {
    constructor(trackRecorder, loopPlayer, audioManager, audioExporter) {
      this.trackRecorder = trackRecorder;
      this.loopPlayer = loopPlayer;
      this.audioManager = audioManager;
      this.audioExporter = audioExporter;
      this.isRecording = false;
      this.isPlaying = false;
      this.isLooping = false;
    }
    
    /**
     * Initialize the UI
     */
    init() {
      this.createControlPanel();
      this.setupEventListeners();
      this.setupVolumeControl();
    }
    
    /**
     * Create the control panel
     */
    createControlPanel() {
      const controlPanel = document.createElement('div');
      controlPanel.className = 'control-panel';
      controlPanel.innerHTML = `
        <div class="control-buttons">
          <button id="record-btn" class="control-btn">
            <i class="fas fa-circle"></i> Record
          </button>
          <button id="play-btn" class="control-btn" disabled>
            <i class="fas fa-play"></i> Play
          </button>
          <button id="loop-btn" class="control-btn" disabled>
            <i class="fas fa-sync"></i> Loop
          </button>
          <button id="stop-btn" class="control-btn" disabled>
            <i class="fas fa-stop"></i> Stop
          </button>
          <button id="download-btn" class="control-btn" disabled>
            <i class="fas fa-download"></i> Download
          </button>
        </div>
        <div class="volume-control">
          <i class="fas fa-volume-down"></i>
          <input type="range" id="volume-slider" min="0" max="100" value="100">
          <i class="fas fa-volume-up"></i>
        </div>
      `;
      
      // Insert after the header
      const header = document.querySelector('.sectionh');
      if (header && header.parentNode) {
        header.parentNode.insertBefore(controlPanel, header.nextSibling);
      } else {
        document.body.insertBefore(controlPanel, document.body.firstChild);
      }
      
      // Add styles
      this.addStyles();
    }
    
    /**
     * Add CSS styles for the UI
     */
    addStyles() {
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        .control-panel {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 30px;
          background: linear-gradient(to right, rgba(3, 39, 110, 0.7), rgba(110, 3, 3, 0.7));
          border-radius: 12px;
          backdrop-filter: blur(10px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
          margin: 20px auto;
          width: 90%;
          max-width: 1000px;
        }
        
        .control-buttons {
          display: flex;
          gap: 15px;
        }
        
        .control-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-family: var(--font-primary);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .control-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }
        
        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .control-btn.active {
          background: rgba(255, 0, 0, 0.6);
          box-shadow: 0 0 10px rgba(255, 0, 0, 0.4);
        }
        
        .control-btn.active-play {
          background: rgba(0, 255, 0, 0.6);
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.4);
        }
        
        .control-btn.active-loop {
          background: rgba(0, 128, 255, 0.6);
          box-shadow: 0 0 10px rgba(0, 128, 255, 0.4);
        }
        
        .volume-control {
          display: flex;
          align-items: center;
          gap: 10px;
          color: white;
        }
        
        #volume-slider {
          -webkit-appearance: none;
          width: 120px;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          outline: none;
        }
        
        #volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .record-indicator, .playback-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 10px 15px;
          border-radius: 8px;
          font-family: var(--font-primary);
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 1000;
          animation: pulse 1.5s infinite;
        }
        
        .record-indicator span {
          color: red;
          font-size: 16px;
        }
        
        .playback-indicator span {
          color: #00ff00;
          font-size: 16px;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        
        .key-pad.playing {
          animation: pad-highlight 0.2s ease;
        }
        
        @keyframes pad-highlight {
          0% { transform: scale(1); background: rgba(255, 255, 255, 0.3); }
          50% { transform: scale(1.05); background: rgba(255, 255, 255, 0.5); }
          100% { transform: scale(1); background: rgba(41, 41, 92, 0.7); }
        }
      `;
      document.head.appendChild(styleElement);
    }
    
    /**
     * Set up event listeners for the UI controls
     */
    setupEventListeners() {
      // Record button
      const recordBtn = document.getElementById('record-btn');
      recordBtn.addEventListener('click', () => {
        if (this.isRecording) {
          this.stopRecording();
        } else {
          this.startRecording();
        }
      });
      
      // Play button
      const playBtn = document.getElementById('play-btn');
      playBtn.addEventListener('click', () => {
        if (this.isPlaying) {
          this.stopPlayback();
        } else {
          this.playTrack();
        }
      });
      
      // Loop button
      const loopBtn = document.getElementById('loop-btn');
      loopBtn.addEventListener('click', () => {
        if (this.isLooping) {
          this.stopPlayback();
        } else {
          this.loopTrack();
        }
      });
      
      // Stop button
      const stopBtn = document.getElementById('stop-btn');
      stopBtn.addEventListener('click', () => {
        this.stopPlayback();
      });
      
      // Download button
      const downloadBtn = document.getElementById('download-btn');
      downloadBtn.addEventListener('click', () => {
        this.downloadTrack();
      });
      
      // Keyboard events for recording
      document.addEventListener('keydown', (e) => {
        const keyCode = e.keyCode;
        
        // Record the keydown event if recording
        if (this.isRecording) {
          this.trackRecorder.recordEvent(keyCode, 'keydown');
        }
      });
      
      document.addEventListener('keyup', (e) => {
        const keyCode = e.keyCode;
        
        // Record the keyup event if recording
        if (this.isRecording) {
          this.trackRecorder.recordEvent(keyCode, 'keyup');
        }
      });
    }
    
    /**
     * Set up volume control
     */
    setupVolumeControl() {
      const volumeSlider = document.getElementById('volume-slider');
      volumeSlider.addEventListener('input', () => {
        const volume = volumeSlider.value / 100;
        this.audioManager.setVolume(volume);
      });
    }
    
    /**
     * Start recording
     */
    startRecording() {
      if (this.isPlaying) {
        this.stopPlayback();
      }
      
      this.isRecording = true;
      this.trackRecorder.startRecording();
      
      // Update UI
      const recordBtn = document.getElementById('record-btn');
      recordBtn.classList.add('active');
      recordBtn.innerHTML = '<i class="fas fa-square"></i> Stop Recording';
      
      // Disable other buttons
      document.getElementById('play-btn').disabled = true;
      document.getElementById('loop-btn').disabled = true;
      document.getElementById('download-btn').disabled = true;
      document.getElementById('stop-btn').disabled = false;
    }
    
    /**
     * Stop recording
     */
    stopRecording() {
      this.isRecording = false;
      const track = this.trackRecorder.stopRecording();
      
      // Update UI
      const recordBtn = document.getElementById('record-btn');
      recordBtn.classList.remove('active');
      recordBtn.innerHTML = '<i class="fas fa-circle"></i> Record';
      
      // Enable other buttons if track was recorded
      if (track) {
        document.getElementById('play-btn').disabled = false;
        document.getElementById('loop-btn').disabled = false;
        document.getElementById('download-btn').disabled = false;
      }
      
      document.getElementById('stop-btn').disabled = true;
    }
    
    /**
     * Play the recorded track
     */
    playTrack() {
      const track = this.trackRecorder.getCurrentTrack();
      if (!track) return;
      
      this.isPlaying = true;
      this.isLooping = false;
      
      this.loopPlayer.playTrack(track, () => {
        this.isPlaying = false;
        this.updatePlaybackUI(false);
      });
      
      // Update UI
      this.updatePlaybackUI(true);
    }
    
    /**
     * Loop the recorded track
     */
    loopTrack() {
      const track = this.trackRecorder.getCurrentTrack();
      if (!track) return;
      
      this.isPlaying = true;
      this.isLooping = true;
      
      this.loopPlayer.loopTrack(track, 4); // Loop 4 times
      
      // Update UI
      this.updatePlaybackUI(true, true);
    }
    
    /**
     * Stop playback
     */
    stopPlayback() {
      this.loopPlayer.stop();
      this.isPlaying = false;
      this.isLooping = false;
      
      // Update UI
      this.updatePlaybackUI(false);
    }
    
    /**
     * Update playback UI
     * @param {boolean} isPlaying - Whether playback is active
     * @param {boolean} isLooping - Whether looping is active
     */
    updatePlaybackUI(isPlaying, isLooping = false) {
      const playBtn = document.getElementById('play-btn');
      const loopBtn = document.getElementById('loop-btn');
      const stopBtn = document.getElementById('stop-btn');
      const recordBtn = document.getElementById('record-btn');
      
      if (isPlaying) {
        playBtn.classList.toggle('active-play', !isLooping);
        loopBtn.classList.toggle('active-loop', isLooping);
        playBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        loopBtn.innerHTML = '<i class="fas fa-sync"></i> Stop Loop';
        stopBtn.disabled = false;
        recordBtn.disabled = true;
      } else {
        playBtn.classList.remove('active-play');
        loopBtn.classList.remove('active-loop');
        playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
        loopBtn.innerHTML = '<i class="fas fa-sync"></i> Loop';
        stopBtn.disabled = true;
        recordBtn.disabled = false;
      }
    }
    
    /**
     * Download the recorded track as WAV
     */
    async downloadTrack() {
      const wavUrl = await this.audioExporter.exportCurrentTrack();
      if (!wavUrl) {
        alert('Failed to export track. Please try again.');
        return;
      }
      
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = wavUrl;
      downloadLink.download = `musicpad_track_${Date.now()}.wav`;
      
      // Trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  }
  