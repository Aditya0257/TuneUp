function search(event){
    event.preventDefault(); 
    const searchInput=document.getElementById('search-input');
    let searchedText = searchInput.value;
    console.log(searchedText);
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', `/search?search=${searchedText}`, true);
  
    xhr.onload = function() {
      if (this.status === 200) {
        // Replace the content of an element with the AJAX response
        document.getElementById('home_DraggableDiv').innerHTML = this.responseText;
  
        // Change the URL displayed in the address bar
        history.pushState(null, '', '/search');
        
      }
      const heading = document.getElementById('search-heading');
      heading.innerHTML = searchedText;
    };
    xhr.send();

    
  }
