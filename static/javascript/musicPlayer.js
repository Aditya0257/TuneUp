//? Playing song when user selects from mainPage not from musicPlayer

const progressBarValue = document.getElementById("music_progress_bar");
const song = document.getElementById("song");
const play = document.getElementById("playButton");



  
//? Homepage progress bar update
function updateTime() {
  let minutes = Math.floor(song.currentTime / 60);
  let seconds = Math.round(song.currentTime - minutes * 60);
  document.querySelector('.current-time').innerHTML = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  progressBarValue.value = song.currentTime;
  // progressBarValue.style.background = "linear-gradient(to right, green, " + (song.currentTime / song.duration) * 100 + "%, grey " + (song.currentTime / song.duration) * 100 + "%)";
  // if((song.currentTime/song.duration)==1 && watch_playlist!=[]){
    // console.log(watch_playlist);
    // console.log(song_index);
    // fetchNextSong(watch_playlist[song_index]['videoId']);
  // }
}
song.addEventListener('timeupdate', updateTime);

function handleProgressInput() {
  console.log('-------');
  song.currentTime = progressBarValue.value;
  let minutes = Math.floor(song.currentTime / 60);
  let seconds = Math.round(song.currentTime - minutes * 60);
  document.querySelector('.current-time').innerHTML = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  // progressBarValue.style.background = "linear-gradient(to right, green, " + (song.currentTime / song.duration) * 100 + "%, grey " + (song.currentTime / song.duration) * 100 + "%)";
} 
progressBarValue.addEventListener('input', handleProgressInput);
progressBarValue.addEventListener('mousedown', function() {
  song.removeEventListener('timeupdate', updateTime);
});
progressBarValue.addEventListener('mouseup', function() {
  song.addEventListener('timeupdate', updateTime);
});


//? On loading song
song.onloadedmetadata = function () {
  progressBarValue.max = song.duration;
  let minutes = Math.floor(song.duration / 60);
  let seconds = Math.round(song.duration - minutes * 60);
  document.querySelector('.ending-time').innerHTML=minutes+':'+(seconds < 10 ? '0' : '') + seconds;
  progressBarValue.value = song.currentTime;
};
  
//Play-Pause event
const playPause = (event) => {
    if(event){
      event.stopPropagation();
    }
    if (play.classList.contains("fa-pause")) {
      song.pause();
      play.classList.remove("fa-pause");
      play.classList.add("fa-play");
      sessionStorage.setItem('songStatus','pause');
    } else {
      
      song.play();
      play.classList.remove("fa-play");
      play.classList.add("fa-pause");
      sessionStorage.setItem('songStatus','play');
    }
  }


// if(sessionStorage.getItem('songStatus')=='play'){
//   console.log('playing');
//   play.classList.remove("fa-pause");
//   play.classList.add("fa-play");
//   playPause();
// }else{
//   console.log('pause');
//   play.classList.remove("fa-play");
//   play.classList.add("fa-pause");
//   playPause();
// }

  

function playSong(videoId) {
  console.log(videoId);
  fetchSong(videoId);
}

const fetchSong = async (videoId) => {
    try {
      const response = await fetch(`/playSong?videoId=${videoId}`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },// set a timeout of 5 seconds for the request
      });
      const data = await response.json();
      const song_index = 1;
      sessionStorage.setItem("song_index", song_index);
      console.log(data);
      const d = JSON.stringify(data);
      sessionStorage.setItem("songData", d);
      document.querySelector(".audio-link").setAttribute("src", data["url"]);
      console.log(document.querySelector(".audio-link").getAttribute('src'));
      document.getElementById('song-image').setAttribute('src',data['songDetail']['videoDetails']['thumbnail']['thumbnails'][data['songDetail']['videoDetails']['thumbnail']['thumbnails'].length-1]['url']);
      document.getElementById('song-name').innerHTML = data['songDetail']['videoDetails']['title'];
      document.getElementById('song-artist').innerHTML = data['songDetail']['videoDetails']['author'];
      play.classList.remove("fa-pause");
      play.classList.add("fa-play");
      playPause();
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        // handle network errors and timeouts
        console.log("Something went wrong! Trying again..");
        // playSong(videoId);
      } else if (error.response && error.response.status === 403) {
        console.log("Something went wrong! Trying again..");
        // playSong(videoId);
      }
    }
  };