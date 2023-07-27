import os
from flask import Flask, render_template, request, jsonify, session, json
from pymongo import MongoClient
from ytmusicapi import YTMusic
import youtube_dl
from pytube import YouTube
from collections import deque
import random
import time


app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY')


mongo_client = MongoClient('mongodb://localhost:27017/')
db = mongo_client['music']
collection_played_songs = db.songs
collection_liked_songs = db.liked_songs


# # Function to check if a song's name is within the allowed length
def is_name_length_allowed(title, max_name_length=40):
    return len(title) <= max_name_length


@app.route('/', methods=["GET"])
def index():
    home_data = ytmusic.get_home(10)
    quick_picks = []
    new_releases = []
    recommended_music = []
    # Static data for genres and moods
    genres = ['Pop', 'Rock', 'Orchestral',
              'Hip Hop', 'Electronic', 'Classical', 'Jazz']
    moods = ['Happy', 'Sad', 'Energetic', 'Romantic',
             'Motivated', 'Classic Country', 'Chill']
    for data in home_data:
        if (data['title'] == 'Quick picks' or data['title'][0:7] == 'Welcome'):
            quick_picks = data['contents']
            # Filter out songs with long titles and artist names
            quick_picks = [song for song in quick_picks if is_name_length_allowed(song['title'])]
        elif (data['title'] == 'New releases'):
            new_releases = data['contents']
        elif (data['title'] == 'Recommended music videos'):
            recommended_music = data['contents']

    return render_template('index.html', quickPicks=quick_picks, newReleases=new_releases, recommendedMusic=recommended_music, genre_category={'Genres': genres, 'Moods & moments': moods})


@app.route('/music', methods=["GET"])
def music():
    # Retrieve liked songs data from the session
    liked_songs_received = session.get('liked_songs_received', [])

    # Retrieve liked songs data from the database
    liked_songs_from_db = list(collection_liked_songs.find({}, {"_id": 0}))

    # Check if the received liked songs data is the same as the data from the database
    if liked_songs_received == liked_songs_from_db:
        # If they are the same, use the received data to render the template
        return render_template('music.html', liked_songs=liked_songs_received)
    else:
        # If they are different, update the database with the received data (optional)
        collection_liked_songs.delete_many({})  # Remove old data (if needed)
        for song in liked_songs_received:
            collection_liked_songs.insert_one(song)

        # Now that the database is updated with the received data, use it to render the template
        return render_template('music.html', liked_songs=liked_songs_received)


@app.route('/music', methods=["POST"])
def liked_songs_to_musicpage():

    liked_songs_received = request.json.get("likedSongs", [])
    # Store data in the flask session temporarily to compare
    session['liked_songs_received'] = liked_songs_received
    # with database stored liked songs data in the get request of /music, if both match, then render the liked songs
    # code in music.html file for jinja to display the updated UI.
    # print("Liked songs received from client:", liked_songs_received)
    return jsonify({"message": "Liked songs received successfully", "liked_songs": liked_songs_received})


# Function to add a song to the MongoDB database
def addSongToDatabase(video_id, title, artist, url):
    song_data = {
        'videoId': video_id,
        'title': title,
        'artist': artist,
        'url': url
    }
    collection_played_songs.insert_one(song_data)


# # Initialize a list to store video IDs
# video_ids_list = []

# Initialize a deque to store video IDs
video_ids_list = deque()

# List of different search queries for variety of songs
search_queries = [
    "Top English Songs",
    "Classic English Songs",
    "Indie English Songs",
    "English Rock Songs",
    "English Hip-Hop Songs",
    "English Pop Songs",
    "English Country Songs",
    "English R&B Songs",
    "English Electronic Songs",
    "English Acoustic Songs"
]

"""
# Function to fetch 25 video IDs using YTMusic search
def fetch_25_video_ids():
    global video_ids_list
    limit = 101  # The limit for the search results
    for _ in range(25):
        # Generate a random index between 0 and limit (exclusive)
        random_index = random.randint(0, limit - 1)

        # Try to find a valid videoId from the random index and the next index
        for i in range(5):
            # Generate a random search query from the list of search_queries
            random_query = random.choice(search_queries)
            current_index = random_index + i
            search_results = ytmusic.search(
                query=random_query, limit=limit)
            if current_index < len(search_results) and 'videoId' in search_results[current_index]:
                video_ids_list.append(search_results[current_index]['videoId'])
                break  # If a valid videoId is found, exit the inner loop
        else:
            continue  # If no valid videoId is found in both indices, continue to the next iteration

    print("the video ids list is:", video_ids_list)
"""

"""
MAX_RETRY_ATTEMPTS = 3
@app.route('/playSong', methods=["POST"])
def play_song():

    video_id = request.args.get('videoId')
    # If no videoId is provided, generate a random one
    if not video_id:
        # testing video_id of song -> "I Wanna Be Yours" by arctic monkeys
        # video_id = "nyuo9-OjNNg"
        video_id = get_random_video_id()

    song_detail = ytmusic.get_song(videoId=video_id)
    song_url = f"https://music.youtube.com/watch?v={video_id}"
    print("waiting")
    retry_attempt = 0
    url = None

    while retry_attempt < MAX_RETRY_ATTEMPTS:
        try:
            ydl_opts = {
                'cachedir': '/Users/adityasingh/Developer/projects/music_website/cache',
                'youtube_skip_dash_manifest': True,
                'outtmpl': '%(title)s.%(ext)s',
                'quiet': True,
                'verbose': True,
                'no_warnings': True,
                'extractaudio': True,
                'audioformat': 'mp3',
                'preferredcodec': 'mp3',
                'nocheckcertificate': True,
                'format_limit': 1,
                'max_downloads': 1
            }
            with youtube_dl.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(song_url, download=False)
                url = info['formats'][0]['url']
                break

        except Exception as e:
            print(
                f"Error fetching audio URL with youtube_dl. Retry attempt {retry_attempt + 1}...")
            print("Error:", e)
            retry_attempt += 1
            time.sleep(2)  # Wait for a moment before retrying

    # print(url)

    # If youtube_dl failed to fetch the URL, fallback to pytube
    if url is None:
        try:
            yt = YouTube(f'https://www.youtube.com/watch?v={video_id}')
            url = yt.streams.filter(only_audio=True).first().url
        except Exception as e:
            print("Error fetching audio URL with pytube.")
            print("Error:", e)
            # Handle the situation where both youtube_dl and pytube fail to fetch the URL

    # Extract the thumbnail URL from the song_detail dictionary
    thumbnail_url = song_detail['videoDetails']['thumbnail']['thumbnails'][-1]['url']

    # Construct the response data with all the required information
    response_data = {
        'title': song_detail['videoDetails']['title'],
        'artist': song_detail['videoDetails']['author'],
        'thumbnail_url': thumbnail_url,  # Include the thumbnail URL
        'videoId': song_detail['videoDetails']['videoId'],
        'url': url,
    }

    # Store song data in MongoDB database
    addSongToDatabase(video_id, song_detail['videoDetails']
                      ['title'], song_detail['videoDetails']['author'], url)
    
    print('ended')
    return jsonify(response_data)
"""


# Function to fetch a large number of video IDs using YTMusic search
def fetch_1000_video_ids():
    global video_ids_list
    limit = 101  # The limit for the search results
    num_video_ids_to_fetch = 1000

    while len(video_ids_list) < num_video_ids_to_fetch:
        random_query = random.choice(search_queries)
        search_results = ytmusic.search(query=random_query, limit=limit)
        video_ids = [result['videoId'] for result in search_results if 'videoId' in result]
        video_ids_list.extend(video_ids)

    print("The video ids list is:", video_ids_list)


# Function to get a random video ID from the deque
def get_random_video_id():
    global video_ids_list
    if not video_ids_list:
        fetch_1000_video_ids()
    return video_ids_list.pop()


@app.route('/playSong', methods=["POST"])
def play_song():
    video_id = request.args.get('videoId')
    if not video_id:
        # testing video_id of song -> "I Wanna Be Yours" by arctic monkeys
        # video_id = "nyuo9-OjNNg"
        # video_id = "WxYgXmZ9xh8"
        video_id = get_random_video_id()
    song_detail = ytmusic.get_song(videoId=video_id)
    song_url = f"https://music.youtube.com/watch?v={video_id}"
    print("waiting")
    url = None

    ydl_opts = {
        'cachedir': '/Users/adityasingh/Developer/projects/music_website/cache',
        'youtube_skip_dash_manifest': True,
        'outtmpl': '%(title)s.%(ext)s',
        'quiet': True,
        'verbose': True,
        'no_warnings': True,
        'extractaudio': True,
        'audioformat': 'mp3',
        'preferredcodec': 'mp3',
        'nocheckcertificate': True,
        'format_limit': 1,
        'max_downloads': 1
    }
    with youtube_dl.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(song_url, download=False)
        url = info['formats'][0]['url']
    # If youtube_dl failed to fetch the URL, fallback to pytube
    if url is None:
        try:
            yt = YouTube(f'https://www.youtube.com/watch?v={video_id}')
            url = yt.streams.filter(only_audio=True).first().url
        except Exception as e:
            print("Error fetching audio URL with pytube.")
            print("Error:", e)
    thumbnail_url = song_detail['videoDetails']['thumbnail']['thumbnails'][-1]['url']
    response_data = {
        'title': song_detail['videoDetails']['title'],
        'artist': song_detail['videoDetails']['author'],
        'thumbnail_url': thumbnail_url,  # Include the thumbnail URL
        'videoId': song_detail['videoDetails']['videoId'],
        'url': url,
    }
    addSongToDatabase(video_id, song_detail['videoDetails']
                      ['title'], song_detail['videoDetails']['author'], url)
    print('ended')
    return jsonify(response_data)


@app.route('/search', methods=['GET'])
def search():
    search = request.args.get("search")
    if (search):
        result = ytmusic.search(search, limit=100)
        songs = []
        albums = []
        community_playlist = []
        artists = []
        for element in result:
            if (element['category'] == 'Songs'):
                songs.append(element)
            elif (element['category'] == 'Community playlists'):
                community_playlist.append(element)
            elif (element['category'] == 'Albums'):
                albums.append(element)
            elif (element['category'] == 'Artists'):
                artists.append(element)
        return render_template('search.html', songs=songs, albums=albums, community_playlist=community_playlist, artists=artists)
    else:
        response = {"error": "Please search for a song"}
        print(response)
        return


def add_liked_song(video_id, title, artist, thumbnail):
    song_data = {
        'videoId': video_id,
        'title': title,
        'artist': artist,
        'thumbnail': thumbnail
    }
    collection_liked_songs.insert_one(song_data)


def remove_liked_song(video_id):
    collection_liked_songs.delete_one({'videoId': video_id})

# Route to handle like/unlike song


@app.route('/likeSong', methods=['POST'])
def like_song():
    try:
        # Get the liked song details from the request JSON
        video_id = request.json.get('videoId')
        title = request.json.get('title')
        artist = request.json.get('artist')
        thumbnail = request.json.get('thumbnail')
        is_liked = request.json.get('isLiked')

        # If the song is liked (isLiked=True), remove it from MongoDB; otherwise, add it
        if is_liked:
            remove_liked_song(video_id)
        else:
            add_liked_song(video_id, title, artist, thumbnail)

        # Fetch the updated liked songs from the MongoDB collection
        liked_songs = list(collection_liked_songs.find({}, {"_id": 0}))

        # Prepare the response JSON
        response_data = {
            'message': 'Song liked/unliked successfully',
            'isLiked': not is_liked,  # Return the opposite of current isLiked status
            'liked_songs': liked_songs  # Include the updated liked songs in the response
        }

        return jsonify(response_data)

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": "Internal Server Error"}), 500


if __name__ == "__main__":
    ytmusic = YTMusic(
        '/Users/adityasingh/Developer/projects/music_website/python/headers_auth.json')
    app.run(port=5000, debug=True)
