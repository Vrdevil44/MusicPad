/**
 * MusicPad Recording System
 * Enables recording of key presses with timestamps and playback functionality
 */

class TrackRecorder {
    constructor() {
      this.isRecording = false;
      this.startTime = 0;
      this.events = [];
      this.currentTrack = null;
      this.bufferSize = 0;
      this.maxBufferSize = 1024 * 1024 * 10; // 10MB limit
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.tracks = [];
    }
    
    /**
     * Start recording a new track
     */
    startRecording() {
      try {
        if (!this.audioContext) {
          throw new Error('Audio Context not available');
        }
        this.isRecording = true;
        this.startTime = Date.now();
        this.events = [];
        console.log('Recording started');
        
        // Add visual recording indicator
        const recordIndicator = document.createElement('div');
        recordIndicator.id = 'record-indicator';
        recordIndicator.className = 'record-indicator';
        recordIndicator.innerHTML = '<span>●</span> Recording...';
        document.body.appendChild(recordIndicator);
      } catch (error) {
        console.error('Recording failed:', error);
        return false;
      }
    }
    
    /**
     * Stop recording and save the track
     * @returns {Object} The recorded track
     */
    stopRecording() {
      if (!this.isRecording) return null;
      
      this.isRecording = false;
      const endTime = Date.now();
      const duration = endTime - this.startTime;
      
      // Remove recording indicator
      const recordIndicator = document.getElementById('record-indicator');
      if (recordIndicator) {
        document.body.removeChild(recordIndicator);
      }
      
      if (this.events.length === 0) {
        console.log('Recording stopped - No events recorded');
        return null;
      }
      
      this.currentTrack = {
        id: 'track_' + Date.now(),
        events: [...this.events],
        duration: duration,
        createdAt: new Date().toISOString()
      };
      
      console.log(`Recording stopped - ${this.events.length} events recorded over ${duration}ms`);
      return this.currentTrack;
    }
    
    /**
     * Record a key event
     * @param {number} keyCode - The key code
     * @param {string} eventType - The event type ('keydown' or 'keyup')
     */
    recordEvent(keyCode, eventType) {
      if (!this.isRecording) return;
      
      const timestamp = Date.now() - this.startTime;
      this.events.push({
        keyCode,
        eventType,
        timestamp
      });
    }
    
    /**
     * Get the current track
     * @returns {Object} The current track
     */
    getCurrentTrack() {
      return this.currentTrack;
    }
  }
  
  class LoopPlayer {
    constructor(audioManager) {
      this.audioManager = audioManager;
      this.isPlaying = false;
      this.currentTrack = null;
      this.loopCount = 0;
      this.maxLoops = 1;
      this.timeouts = [];
      this.startTime = 0;
      this.onLoopComplete = null;
      this.bpm = 120;
      this.quantize = true;
      this.loops = new Map();
      this.masterClock = null;
    }
    
    /**
     * Play a track once
     * @param {Object} track - The track to play
     * @param {Function} onComplete - Callback when playback completes
     */
    playTrack(track, onComplete = null) {
      if (this.isPlaying) {
        this.stop();
      }
      
      if (!track || !track.events || track.events.length === 0) {
        console.error('No valid track to play');
        return false;
      }
      
      this.currentTrack = track;
      this.isPlaying = true;
      this.startTime = Date.now();
      this.onLoopComplete = onComplete;
      
      // Show playback indicator
      this.showPlaybackIndicator();
      
      // Schedule all events
      track.events.forEach(event => {
        if (event.eventType === 'keydown') {
          const timeout = setTimeout(() => {
            if (this.isPlaying) {
              this.audioManager.playSound(event.keyCode);
              this.highlightPad(event.keyCode);
            }
          }, event.timestamp);
          
          this.timeouts.push(timeout);
        }
      });
      
      // Schedule the end of playback
      const endTimeout = setTimeout(() => {
        this.isPlaying = false;
        this.hidePlaybackIndicator();
        
        if (this.onLoopComplete) {
          this.onLoopComplete();
        }
      }, track.duration + 100); // Add a small buffer
      
      this.timeouts.push(endTimeout);
      
      return true;
    }
    
    /**
     * Loop a track multiple times
     * @param {Object} track - The track to loop
     * @param {number} count - Number of times to loop (default: Infinity)
     */
    loopTrack(track, count = Infinity) {
      if (!track || !track.events || track.events.length === 0) {
        console.error('No valid track to loop');
        return false;
      }
      
      this.stop();
      this.currentTrack = track;
      this.loopCount = 0;
      this.maxLoops = count;
      
      const playNextLoop = () => {
        this.loopCount++;
        
        if (this.loopCount <= this.maxLoops) {
          console.log(`Playing loop ${this.loopCount} of ${this.maxLoops === Infinity ? '∞' : this.maxLoops}`);
          this.playTrack(track, playNextLoop);
        } else {
          console.log('Looping complete');
        }
      };
      
      playNextLoop();
      return true;
    }
    
    /**
     * Stop playback
     */
    stop() {
      this.isPlaying = false;
      
      // Clear all scheduled timeouts
      this.timeouts.forEach(timeout => clearTimeout(timeout));
      this.timeouts = [];
      
      // Hide playback indicator
      this.hidePlaybackIndicator();
      
      console.log('Playback stopped');
    }
    
    /**
     * Show playback indicator
     */
    showPlaybackIndicator() {
      let playbackIndicator = document.getElementById('playback-indicator');
      
      if (!playbackIndicator) {
        playbackIndicator = document.createElement('div');
        playbackIndicator.id = 'playback-indicator';
        playbackIndicator.className = 'playback-indicator';
        document.body.appendChild(playbackIndicator);
      }
      
      playbackIndicator.innerHTML = '<span>▶</span> Playing...';
      playbackIndicator.style.display = 'block';
    }
    
    /**
     * Hide playback indicator
     */
    hidePlaybackIndicator() {
      const playbackIndicator = document.getElementById('playback-indicator');
      if (playbackIndicator) {
        playbackIndicator.style.display = 'none';
      }
    }
    
    /**
     * Highlight a pad during playback
     * @param {number} keyCode - The key code to highlight
     */
    highlightPad(keyCode) {
      const padElement = document.getElementById(`pad-${keyCode}`);
      if (padElement) {
        padElement.classList.add('playing');
        setTimeout(() => {
          padElement.classList.remove('playing');
        }, 200);
      }
    }
    
    // Add quantization method
    quantizeTime(timestamp) {
      if (!this.quantize) return timestamp;
      const beatDuration = 60000 / this.bpm;
      return Math.round(timestamp / beatDuration) * beatDuration;
    }
  }
  
  class AudioManager {
    constructor(baseUrl) {
      this.baseUrl = baseUrl;
      this.loadedSounds = {};
      this.volume = 1.0;
      
      // Preload common sounds to avoid initial delay
      this.preloadCommonSounds();
    }
    
    /**
     * Preload commonly used sounds
     */
    preloadCommonSounds() {
      // Common key codes (most frequently used)
      const commonKeyCodes = [113, 119, 101, 114, 97, 115, 100, 102]; // q, w, e, r, a, s, d, f
      
      // Preload in background
      setTimeout(() => {
        commonKeyCodes.forEach(keyCode => {
          this.loadSound(keyCode)
            .then(() => console.log(`Preloaded sound ${keyCode}`))
            .catch(err => console.warn(`Could not preload sound ${keyCode}:`, err));
        });
      }, 1000);
    }
    
    /**
     * Load a sound
     * @param {number} keyCode - The key code
     * @returns {Promise<HTMLAudioElement>} The audio element
     */
    async loadSound(keyCode) {
      if (this.loadedSounds[keyCode]) {
        return this.loadedSounds[keyCode];
      }
      
      return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.src = `${this.baseUrl}/${keyCode}.wav`;
        
        audio.addEventListener('canplaythrough', () => {
          this.loadedSounds[keyCode] = audio;
          resolve(audio);
        });
        
        audio.addEventListener('error', (e) => {
          console.error(`Error loading sound ${keyCode} from ${audio.src}:`, e);
          reject(e);
        });
        
        audio.load();
      });
    }
    
    /**
     * Play a sound
     * @param {number} keyCode - The key code
     * @returns {HTMLAudioElement} The audio element
     */
    async playSound(keyCode) {
      try {
        const audio = await this.loadSound(keyCode);
        const clone = audio.cloneNode();
        clone.volume = this.volume;
        
        // Add error handling for playback
        const playPromise = clone.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error(`Error playing sound ${keyCode}:`, error);
          });
        }
        
        return clone;
      } catch (error) {
        console.error(`Error playing sound ${keyCode}:`, error);
        return null;
      }
    }
    
    /**
     * Set the volume
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setVolume(volume) {
      this.volume = Math.max(0, Math.min(1, volume));
    }
  }
  
  // Export functionality for WAV download
  class AudioExporter {
    constructor(trackRecorder, audioManager) {
      this.trackRecorder = trackRecorder;
      this.audioManager = audioManager;
    }
    
    /**
     * Export the current track to WAV
     * @returns {Promise<string>} URL to the exported WAV file
     */
    async exportCurrentTrack() {
      const track = this.trackRecorder.getCurrentTrack();
      if (!track) {
        console.error('No track to export');
        return null;
      }
      
      try {
        // Create an offline audio context for rendering
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const offlineContext = new OfflineAudioContext(2, 44100 * (track.duration / 1000 + 1), 44100);
        
        // Load all sounds used in the track
        const uniqueKeyCodes = [...new Set(track.events
          .filter(event => event.eventType === 'keydown')
          .map(event => event.keyCode))];
        
        const soundBuffers = {};
        
        for (const keyCode of uniqueKeyCodes) {
          try {
            const audioElement = await this.audioManager.loadSound(keyCode);
            
            // Create a temporary audio element to avoid CORS issues
            const tempAudio = new Audio();
            tempAudio.crossOrigin = "anonymous";
            tempAudio.src = audioElement.src;
            
            // Wait for the audio to load
            await new Promise((resolve, reject) => {
              tempAudio.addEventListener('canplaythrough', resolve);
              tempAudio.addEventListener('error', reject);
              tempAudio.load();
            });
            
            // Create a MediaElementSourceNode
            const sourceNode = audioContext.createMediaElementSource(tempAudio);
            
            // Create a temporary destination
            const tempDestination = audioContext.createMediaStreamDestination();
            sourceNode.connect(tempDestination);
            
            // Play the audio (this is needed to get the audio data)
            tempAudio.play();
            
            // Create a buffer from the audio data
            const buffer = await audioContext.createBuffer(2, 44100 * (tempAudio.duration || 2), 44100);
            soundBuffers[keyCode] = buffer;
            
            // Stop the audio
            tempAudio.pause();
            tempAudio.currentTime = 0;
          } catch (error) {
            console.error(`Error loading sound ${keyCode}:`, error);
          }
        }
        
        // If no sounds were loaded successfully, try an alternative approach
        if (Object.keys(soundBuffers).length === 0) {
          return this.exportTrackAlternative(track);
        }
        
        // Schedule all events
        track.events.forEach(event => {
          if (event.eventType === 'keydown' && soundBuffers[event.keyCode]) {
            const source = offlineContext.createBufferSource();
            source.buffer = soundBuffers[event.keyCode];
            source.connect(offlineContext.destination);
            source.start(event.timestamp / 1000); // Convert ms to seconds
          }
        });
        
        // Render audio
        const renderedBuffer = await offlineContext.startRendering();
        
        // Convert to WAV
        const wavBlob = this.bufferToWav(renderedBuffer);
        return URL.createObjectURL(wavBlob);
      } catch (error) {
        console.error('Error exporting track:', error);
        return this.exportTrackAlternative(track);
      }
    }
    
    /**
     * Alternative export method that creates a simple beep sound for each event
     * @param {Object} track - The track to export
     * @returns {Promise<string>} URL to the exported WAV file
     */
    async exportTrackAlternative(track) {
      try {
        console.log('Using alternative export method');
        
        // Create an offline audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const offlineContext = new OfflineAudioContext(2, 44100 * (track.duration / 1000 + 1), 44100);
        
        // Create a simple beep sound for each event
        track.events.forEach(event => {
          if (event.eventType === 'keydown') {
            // Create oscillator
            const oscillator = offlineContext.createOscillator();
            const gainNode = offlineContext.createGain();
            
            // Set frequency based on keyCode (to differentiate sounds)
            oscillator.frequency.value = 220 + (event.keyCode % 88) * 10;
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(offlineContext.destination);
            
            // Schedule start and stop
            const startTime = event.timestamp / 1000;
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.1);
            
            // Envelope
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.7, startTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, startTime + 0.1);
          }
        });
        
        // Render audio
        const renderedBuffer = await offlineContext.startRendering();
        
        // Convert to WAV
        const wavBlob = this.bufferToWav(renderedBuffer);
        return URL.createObjectURL(wavBlob);
      } catch (error) {
        console.error('Error in alternative export:', error);
        alert('Could not export audio. Please try again or check console for errors.');
        return null;
      }
    }
    
    /**
     * Convert an AudioBuffer to WAV format
     * @param {AudioBuffer} buffer - The audio buffer
     * @returns {Blob} WAV blob
     */
    bufferToWav(buffer) {
      const numOfChan = buffer.numberOfChannels;
      const length = buffer.length * numOfChan * 2;
      const sampleRate = buffer.sampleRate;
      
      const wav = new DataView(new ArrayBuffer(44 + length));
      
      // RIFF chunk descriptor
      this.writeString(wav, 0, 'RIFF');
      wav.setUint32(4, 36 + length, true);
      this.writeString(wav, 8, 'WAVE');
      
      // FMT sub-chunk
      this.writeString(wav, 12, 'fmt ');
      wav.setUint32(16, 16, true); // subchunk size
      wav.setUint16(20, 1, true); // PCM format
      wav.setUint16(22, numOfChan, true); // num of channels
      wav.setUint32(24, sampleRate, true); // sample rate
      wav.setUint32(28, sampleRate * numOfChan * 2, true); // byte rate
      wav.setUint16(32, numOfChan * 2, true); // block align
      wav.setUint16(34, 16, true); // bits per sample
      
      // Data sub-chunk
      this.writeString(wav, 36, 'data');
      wav.setUint32(40, length, true);
      
      // Write PCM samples
      const channelData = [];
      for (let i = 0; i < numOfChan; i++) {
        channelData.push(buffer.getChannelData(i));
      }
      
      let offset = 44;
      for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numOfChan; channel++) {
          const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
          const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          wav.setInt16(offset, int16, true);
          offset += 2;
        }
      }
      
      return new Blob([wav], { type: 'audio/wav' });
    }
    
    /**
     * Write a string to a DataView
     * @param {DataView} dataView - The data view
     * @param {number} offset - The offset
     * @param {string} string - The string to write
     */
    writeString(dataView, offset, string) {
      for (let i = 0; i < string.length; i++) {
        dataView.setUint8(offset + i, string.charCodeAt(i));
      }
    }
  }
  