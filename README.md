# TuneUp - Music Website Project

TuneUp is a music website project that allows users to browse and play songs from YouTube Music (YTMusic) using the official YTMusic API. It provides a user-friendly interface similar to popular music streaming services, allowing users to search for songs, create queues, and enjoy their favorite music.

![TuneUp Prototype](https://user-images.githubusercontent.com/114610458/231032953-1a95d4e5-ff3a-431d-a9d7-eab127394501.png)

## Technologies Used

- Frontend: HTML, CSS, JavaScript
- Backend: Python, Flask, YTMusic API
- Database: MongoDB

## Project Status

TuneUp is currently under active development. New features are being added, and improvements are being made regularly. Please note that the project might have some incomplete or work-in-progress functionalities.

## Getting Started

To run the TuneUp music website project locally, follow the steps below:

```bash
# Clone the Repository:
git clone https://github.com/Aditya0257/TuneUp.git

# Navigate to the project folder
cd music-website

# Install Python dependencies
pip install -r requirements.txt

# Obtain YTMusic API Key
To use the YTMusic API, you will need to obtain an API key. Follow the YTMusic API documentation to generate an API key and save it as headers_auth.json in the python/ directory.

It will look like this ->
{
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Content-Type": "application/json",
    "X-Goog-AuthUser": "0",
    "x-origin": "https://music.youtube.com",
    "Cookie" : "YOUR_YT_MUSIC_COOKIE"
}

# Set Up MongoDB
TuneUp uses MongoDB to store song data. Make sure you have MongoDB installed and running on your machine.

# Start the Server
Start the Flask server by running the following command:
python app.py

# Access the Website
Open your web browser and navigate to http://localhost:5000. You should now be able to access the TuneUp music website.

```

## Features

Browse and play songs from YouTube Music
Search for songs, albums, artists, and community playlists

## License

This project is licensed under the MIT License.
