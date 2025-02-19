# Website Navigation Assistant

A Chrome extension that uses Gemini AI to help users navigate websites more effectively.

## Features

- AI-powered website navigation assistance
- Real-time screenshot analysis
- Side panel interface
- LLM status monitoring
- Responsive chat interface

## Installation

1. Clone this repository:

git clone https://github.com/yourusername/website-navigation-assistant.git

2. Open Chrome and navigate to `chrome://extensions/`.

3. Enable "Developer mode" in the top right.

4. Click "Load unpacked" and select the extension directory.

## Configuration

1. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click the extension options and enter your API key

## Project Structure

```
website-navigation-assistant/
├── manifest.json          # Extension configuration
├── background.js         # Service worker
├── content.js           # Content script
├── sidebar.html        # Side panel UI
├── sidebar.js         # Side panel logic
├── options.html      # Settings page
└── options.js       # Settings logic
```

## Usage

1. Click the extension icon to open the side panel
2. Ask questions about the current webpage
3. The AI will analyze the page content and screenshot to provide navigation assistance

## Development

To modify the extension:

1. Make your changes
2. Reload the extension in `chrome://extensions/`
3. Test the changes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

