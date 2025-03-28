# MusicPad
An interactive music pad with interactive css body.

Landing Page - form.html
![image](https://user-images.githubusercontent.com/125772875/227759349-7febeaa0-0d23-4297-aa85-909a87564081.png)

Login-Signup Form
![image](https://user-images.githubusercontent.com/125772875/227759392-0d292aae-2ea3-4b71-b4f1-86c47cd58eb6.png)

MusicPad - Play Around
![image](https://user-images.githubusercontent.com/125772875/227759415-c26a863b-4228-4afa-8174-41f4969854f1.png)

## 🧠 Project Vision

MusicPad is a collaborative, browser-based audio tool designed to empower users to:
- Create beats and melodies interactively using keyboard mappings
- Record loops in real-time
- Upload or record their own sound samples
- Arrange multi-layered compositions
- Export audio in downloadable formats

## 🔧 Core Features (Current)
- Keyboard-triggered .wav sample playback
- Real-time audio playback using JavaScript/HTML5 Audio API
- jQuery event handling for input mapping
- Sample-based beatmaking

## 🚀 Future Features (Planned)

### 1. 🔴 Recording & Playback System
Purpose: Enable users to record key presses with precise timing and playback in real-time or loops.

#### A. Track Recording
- Class: TrackRecorder
  - Captures pressed keys with relative timestamps
  - Stores multiple recorded tracks in memory

#### B. Loop Functionality
- Class: LoopManager
  - Allows creating looped sequences from recorded tracks
  - Playback can be scheduled and layered with multiple loops
  - Designed for synchronized beat performance

### 2. ⌨️ QWERTY Layout + Sound Customization
Purpose: Enable fully customizable keys with personal samples or recorded clips

#### A. Sound Upload Interface
- Upload .wav files
- Record via microphone
- Preview selected sample

#### B. Microphone Recorder
- Uses navigator.mediaDevices.getUserMedia() and MediaRecorder
- Captures short audio and saves it as Blob

### 3. 🔁 Looping & Sequencing
Purpose: Record, arrange, and stack multiple sequences to form structured tracks

Goals:
- Support 4-5 independent loop channels
- Drag-n-drop builder interface
- Ability to mute, solo, or rearrange loop tracks

### 4. 💾 Track Management & Exporting
Purpose: Provide tools to save sessions, reload projects, and export music

#### A. Local Storage System
- Saves track data to localStorage
- Auto-saves on every recording/edit

#### B. Export Functionality
- Uses OfflineAudioContext to mix and export .wav file
- Generates download link using Blob

### 5. 🧭 Tutorial Mode
Purpose: Onboard and educate users with interactive step-by-step guidance

#### Components:
- TutorialManager Class
- TutorialOverlay Class
- Interactive step-by-step guidance

### 6. 📐 Keyboard Mapping Guidelines

| Key | Sound Type | Suggestion |
|-----|------------|------------|
| Q | Percussion | Kick |
| W | Percussion | Snare |
| E | Percussion | Hi-hat Closed |
| R | Percussion | Hi-hat Open |
| A | FX/Percussion | Clap |
| S | Bass | Bass Hit |
| D | Melody | Synth Shot |
| F | Harmony | Pad Chord |
| Z | Vocal/FX | Voice Sample |
| X | Melody | Guitar Strum |
| C | Percussion | Crash Cymbal |
| V | FX | Reverse FX |

Controls:
- Space = Record
- L = Loop
- Esc = Stop

### 7. 🧪 Technical Requirements

| Area | Technology |
|------|------------|
| Audio Engine | Web Audio API |
| UI Interactions | Vanilla JS / jQuery |
| Sound Upload | File Input + Blob URL |
| Audio Recording | MediaRecorder API |
| Exporting Audio | OfflineAudioContext |
| Save/Load | LocalStorage or Firebase |
| Visualization | Canvas API |
| Background Tasks | Web Workers |

### 8. �� Project Structure

# MusicPad Development Todo List

## Analysis Phase
- [x] Clone and analyze existing codebase
- [x] Understand current implementation and structure
- [ ] Create detailed development plan based on roadmap

## Implementation Phase

### 1. Recording & Playback System
- [ ] Create TrackRecorder class for capturing key presses with timestamps
- [ ] Implement basic recording functionality
- [ ] Develop LoopManager class for creating looped sequences
- [ ] Add UI controls for recording, playback, and looping
- [ ] Implement visual timeline for track visualization

### 2. Sound Customization
- [ ] Create sound upload interface
- [ ] Implement microphone recording functionality
- [ ] Develop sound preview capability
- [ ] Create UI for assigning custom sounds to keys
- [ ] Implement sound storage and retrieval

### 3. Looping & Sequencing
- [ ] Implement multiple independent loop channels
- [ ] Create drag-and-drop builder interface
- [ ] Add mute, solo, and rearrange functionality for loop tracks
- [ ] Implement loop synchronization

### 4. Track Management & Exporting
- [ ] Create TrackStorage class for saving to localStorage
- [ ] Implement auto-save functionality
- [ ] Develop TrackExporter class for exporting to .wav
- [ ] Add project management UI

### 5. Tutorial Mode
- [ ] Create TutorialManager class
- [ ] Develop TutorialOverlay class
- [ ] Design step-by-step tutorial content
- [ ] Implement tutorial UI and navigation

## Testing & Finalization
- [ ] Test all features for functionality
- [ ] Optimize performance
- [ ] Fix bugs and issues
- [ ] Document implementation
- [ ] Prepare final delivery

