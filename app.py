from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
from urllib.request import urlopen
from io import BytesIO
from ytmusicapi import YTMusic
import youtube_dl
from pytube import YouTube

app = Flask(__name__)

mongo_client = MongoClient('mongodb://localhost:27017/')
db = mongo_client['music']
collection = db.songs


@app.route('/', methods=["GET"])
def index():
    home_data = ytmusic.get_home(10)
    genre = ytmusic.get_mood_categories()
    quick_picks = []
    new_releases = []
    recommended_music = []
    for data in home_data:
        if (data['title'] == 'Quick picks' or data['title'][0:7] == 'Welcome'):
            quick_picks = data['contents']
        elif (data['title'] == 'New releases'):
            new_releases = data['contents']
        elif (data['title'] == 'Recommended music videos'):
            recommended_music = data['contents']

    return render_template('index.html', quickPicks=quick_picks, newReleases=new_releases, recommendedMusic=recommended_music, genre_category=genre)


@app.route('/music', methods=["GET"])
def music():
    return render_template('music.html')


@app.route('/playSong', methods=["POST"])
def play_song():

    video_id = request.args.get('videoId')
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
    print(url)
    url1 = song_detail['videoDetails']['thumbnail']['thumbnails'][len(
        song_detail['videoDetails']['thumbnail']['thumbnails']) - 1]['url']
    image_data = urlopen(url1).read()
    image = BytesIO(image_data)
    song_data = {
        'videoId': video_id,
        'title': song_detail['videoDetails']['title'],
        'artist': song_detail['videoDetails']['author'],
        "$set": {'url': 'https://www.example.com/path'}
    }
    result = db.songs.insert_one(song_data)
    print(result.inserted_id)
    print('ended')
    return jsonify({'url': url, 'songDetail': song_detail})


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


if __name__ == "__main__":
    ytmusic = YTMusic(
        '/Users/adityasingh/Developer/projects/music_website/python/headers_auth.json')
    app.run(port=5000, debug=True)
