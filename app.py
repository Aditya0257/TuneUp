from flask import Flask,render_template, session, url_for, request, redirect, jsonify
from pymongo import MongoClient
from urllib.request import urlopen
from colorthief import ColorThief
import json
from io import BytesIO
import time

# * using spotify api to get top artists
import spotipy
from spotipy.oauth2 import SpotifyOAuth

# * ytmusicapi
from ytmusicapi import YTMusic
# ? ytmusicapi api's get_chart is not working
# ? ytmusicapi api's get_song is not giving url directly
# ? get_song is giving signatureCipher in which url is present which needs to be decoded
# ? but it is also not getting decoded :/
# ? that's why I've looked for 2 other api's to get url link from yt directly using videoId.
# * youtube_dl api to get audio url
import youtube_dl
# * pytube to get audio url
from pytube import YouTube


# * creating a flask application
app = Flask(__name__)

# * Set up MongoDB client
# mongo_client = MongoClient('mongodb://localhost:27017/')
# db = mongo_client.music

# collection = db.songs
mongo_client = MongoClient('mongodb://localhost:27017/')
db = mongo_client['music']
collection = db.songs
# collection = db.create_collection('songs1')
database_names = mongo_client.list_database_names()
print(database_names)

# ? after creating an app on spotify after logging in, we get client_id and client_secret to connect.
client_id = '67402e424df44b74b6a04c807365b372'
client_secret = 'f3c78710e7c7412b937e57ba98c9ca90'

# ? Flask secret key
app.secret_key = "TuneUpSecretKey"
# ? Session cookie name
app.config["SESSION_COOKIE_NAME"] = 'Tune Up Cookie'
# ? Key to store token info in session
TOKEN_INFO = "token_info"

# * Login route
@app.route('/login')
def login():
    # Create SpotifyOAuth object with client ID, client secret, and callback URL
    sp_oauth = create_spotify_oauth()
    # Get authorization URL
    auth_url = sp_oauth.get_authorize_url()
    # Redirect user to authorization URL 
    return redirect(auth_url)

# * Callback route
@app.route('/callback')
def callback():
    sp_oauth = create_spotify_oauth()
    # Clear session data
    session.clear()
    # Get authorization code from query parameters
    code = request.args.get('code')
    # Get access token and other token information from authorization code
    token_info = sp_oauth.get_access_token(code)
    # Store token information in session
    session[TOKEN_INFO] = token_info
    # Redirect user to the home (index) page
    return redirect(url_for('index', _external = True))

# * Home page route
@app.route('/', methods=["GET"])
def index():

    if not session.get(TOKEN_INFO):
        return redirect(url_for('login'))
    
    try:
        # print(f'the session data is _________{session}')
        # Get token information from session
        token_info = get_token()
    except:
        print("user not logged in")
        # Redirect user to login if token information is not found in session
        redirect(url_for('login', _external = False))


    home_data = ytmusic.get_home(10)
    genre = ytmusic.get_mood_categories()
    # return genre 
    quick_picks = []
    my_mixes = []

    # ?
    # ?
    # ?
    # ?
    # * ------------------------------ ytmusicapi STARTS ----------------------------------------
    
    # * Get the QuickPicks and MixedforYou data from ytmusic.get_home api
    for data in home_data:
        if (data['title'] == 'Quick picks' or data['title'][0:7] == 'Welcome'):
            quick_picks = data['contents']
        elif (data['title'] == 'Mixed for you'):
            my_mixes = data['contents']
    
    # * ------------------------------ ytmusicapi ENDS ----------------------------------------
    # ?
    # ?
    # ?
    # ?
    # * ------------------------------ CONNECTING SPOTIFY API TO GET TOP ARTISTS - STARTS -----------------------

    # Create Spotify object with access token
    # sp = spotipy.Spotify(auth=token_info['access_token'])
    # print(sp.current_user_saved_tracks(limit=50, offset=0))

    # ? Extract the artist names, number of followers, and total song views and add them to a list

    # top_artists = []
    
    # results = sp.current_user_top_artists(
    #     time_range='medium_term', limit=20, offset=0)
    # for artist in results['items']:
    #     name = artist['name']
    #     followers = artist['followers']['total']
    #     if artist['images']:
    #         image_url = artist['images'][0]['url']
    #     else:
    #         image_url = ''
    #     total_views =  sum([t['popularity'] for t in sp.artist_top_tracks(artist['id'])['tracks']])
    #     top_artists.append({
    #     'name': name,
    #     'followers': followers,
    #     'image_url': image_url,
    #     'total_views': total_views,
    #     })

    # results = sp.search(q='artist:Eminem track:Lose Yourself', type='track')
    # track_uri = results['tracks']['items'][0]['uri']
    # track = sp.track(track_uri)
    # print(track['external_urls']['spotify'])
    # print(top_artists)
    

    # * ------------------------------ CONNECTING SPOTIFY API TO GET TOP ARTISTS - ENDS -------------------------
    # ?
    # ?
    # ?
    # ?
    
    # songs = db.songs.find()
    # print(songs)
    
   
    return render_template('index.html', quickPicks=quick_picks, myMixes=my_mixes, topArtists = [], genre_category = genre)

# * Music page route
@app.route('/music', methods=["GET"])
def music():
    return render_template('music.html')


# * Play song route
@app.route('/playSong', methods=["POST"])
def play_song():
    
    video_id = request.args.get('videoId')
    print('--------------------------------------')
    song_detail = ytmusic.get_song(videoId=video_id)
    # print(song_detail) 
    song_url = f"https://music.youtube.com/watch?v={video_id}"
    print("waiting")
    # ?
    # ?
    # ?
    # * ------------------------------  AUDIO URL RETRIEVAL FROM YOUTUBE_DL STARTS ----------------------------------------

    try:
        # Configure youtube_dl options
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

        # Download the song and extract the streaming URL
        with youtube_dl.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(song_url, download=False)
            url = info['formats'][0]['url']
     # * ------------------------------ AUDIO URL RETRIEVAL FROM YOUTUBE_DL ENDS ----------------------------------------
    # ?
    # ?
    # ?
    # * ------------------------------ AUDIO URL RETRIEVAL FROM PYTUBE - CODE STARTS ( few seconds slower than youtube dl method) ----------------------------------------
    
    except:
        # Create a YouTube object
        yt = YouTube(f'https://www.youtube.com/watch?v={video_id}')

        # Get the audio URL
        url = yt.streams.filter(only_audio=True).first().url
    # * ------------------------------ AUDIO URL FROM PYTUBE - CODE ENDS ----------------------------------------
    # ?
    # ?
    # ?

    print(url)

    # json_object = json.dumps(song_detail, indent=4)
    url1 = song_detail['videoDetails']['thumbnail']['thumbnails'][len(song_detail['videoDetails']['thumbnail']['thumbnails']) - 1]['url']
    image_data = urlopen(url1).read()
    image = BytesIO(image_data)

    # Create a new ColorThief object with the image
    color_thief = ColorThief(image)
    dominant_color = color_thief.get_color(quality=10)
    print(dominant_color)

    song_data = {
        'videoId': video_id,
        'title': song_detail['videoDetails']['title'],
        'artist': song_detail['videoDetails']['author'],
        "$set": {'url': 'lakshyabuoy'}
    }
    result = db.songs.insert_one(song_data)
    print(result.inserted_id)
    print('ended')
    return jsonify({'url': url, 'songDetail': song_detail, 'color': dominant_color})

   


@app.route('/music', methods = ["GET"])
def music_page():
    artist_album_data = ytmusic.get_artist_albums("UC0VOyT2OCBKdQhF3BAbZ-1g", "6gPjAUdxY0JXcGdCQ3BVQkNpUjVkRjl3WVdkbFgzTnVZWEJ6YUc5MFgyMTFjMmxqWDNCaFoyVmZjbVZuYVc5dVlXd1NIMDA1V1hoQlRYVnlPVGxyWmxsT2FFUm1hV1JQU0Zoa2NHdFBOVWxpVW1jYVRBQUFaVzRBQVVsT0FBRkpUZ0FCQUVaRmJYVnphV05mWkdWMFlXbHNYMkZ5ZEdsemRBQUJBVU1BQUFFQUFRQUFBUUVBVlVOc1dWWTJhRWhzZFhCdFgxTmZUMkpUTVZjdFJGbDNBQUh5MnJPcUNnWkFBVWdBVUJF")
    return render_template('music.html', artistAlbumData = artist_album_data)


# * Function to get token information from session and refresh access token if necessary
def get_token():
    # Get token information from session
    token_info = session.get(TOKEN_INFO, None)
    # print(session)
    # print(f'the token info containing access and refresh token is ____________{token_info}')

    # Raise exception if token information is not found in session
    if not token_info:
        raise Exception("Token info not found")
    
    # Get current time in seconds
    now = int(time.time())
    # Check if access token is expired (within 60 seconds of expiration)
    is_expired = token_info['expires_at'] - now < 60

    # If access token is expired, refresh access token using refresh token
    if is_expired:
        sp_oauth = create_spotify_oauth()
        token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
        # Store new token information in session
        session[TOKEN_INFO] = token_info
    # Return token information
    return token_info

# ? Function to create SpotifyOAuth object with client ID, client secret, and callback URL
def create_spotify_oauth():
    return SpotifyOAuth(
        client_id = client_id,
        client_secret = client_secret,
        redirect_uri = url_for('callback', _external = True),
        scope = "user-library-read")

# TODO: to tell which languages you have used while pushing code to git hosting services (Github & Gitlab) -:
# ? touch .gitattributes -> nano .gitattributes -> 
# ? *.py   linguist-language=python
# ? *.js   linguist-language=javascript
# ? *.html linguist-language=html -> then, Ctrl + X , then Y and `Enter`.


if __name__ == "__main__":
    ytmusic = YTMusic(
        '/Users/adityasingh/Developer/projects/music_website/python/headers_auth.json')
    app.run(debug=True)