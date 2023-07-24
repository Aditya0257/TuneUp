import os
from flask import Flask, render_template, request, jsonify, session, json
from pymongo import MongoClient
from ytmusicapi import YTMusic
import youtube_dl
from pytube import YouTube
import random



app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY')



mongo_client = MongoClient('mongodb://localhost:27017/')
db = mongo_client['music']
collection_played_songs = db.songs
collection_liked_songs = db.liked_songs


@app.route('/', methods=["GET"])
def index():
    home_data = ytmusic.get_home(10)
    quick_picks = []
    new_releases = []
    recommended_music = []
    # Static data for genres and moods
    genres = ['Pop', 'Rock', 'Orchestral', 'Hip Hop', 'Electronic', 'Classical', 'Jazz']
    moods = ['Happy', 'Sad', 'Energetic', 'Romantic', 'Motivated', 'Classic Country', 'Chill']
    for data in home_data:
        if (data['title'] == 'Quick picks' or data['title'][0:7] == 'Welcome'):
            quick_picks = data['contents']
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
    session['liked_songs_received'] = liked_songs_received  # Store data in the flask session temporarily to compare 
    # with database stored liked songs data in the get request of /music, if both match, then render the liked songs
    # code in music.html file for jinja to display the updated UI. 
    print("Liked songs received from client:", liked_songs_received)
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


# Function to get a random video ID
@app.route('/getRandomVideoIds', methods=["GET"])
def get_random_video_id():
    # Generate a random query
    random_query = ''.join(random.choices('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=10))

    # Search for videos using the random query
    search_results = ytmusic.search(query=random_query, filter="video", limit=1)

    # Extract the video ID from the search results
    if search_results and 'videoId' in search_results[0]:
        return search_results[0]['videoId']

    # If no video ID is found, return None
    return None


@app.route('/playSong', methods=["POST"])
def play_song():

    video_id = request.args.get('videoId')
    # If no videoId is provided, generate a random one
    if not video_id:
        video_id = get_random_video_id() 
    song_detail = ytmusic.get_song(videoId=video_id)
    song_url = f"https://music.youtube.com/watch?v={video_id}"
    print("waiting")
    try:
        ydl_opts = {
            'cachedir': '/Users/adityasingh/Developer/projects/music_website/cache',
            'youtube_skip_dash_manifest': True,
            'outtmpl': '%(title)s.%(ext)s',
            'quiet': True,
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

    except:
        yt = YouTube(f'https://www.youtube.com/watch?v={video_id}')
        url = yt.streams.filter(only_audio=True).first().url
    # print(url)

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
    addSongToDatabase(video_id, song_detail['videoDetails']['title'], song_detail['videoDetails']['author'], url)
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
