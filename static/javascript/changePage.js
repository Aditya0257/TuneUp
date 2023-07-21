function changePage(route, callback){
   
    var xhr = new XMLHttpRequest();
    xhr.open('GET', `/${route}`, true);
  
    xhr.onload = function() {
      if (this.status === 200) {
        // Replace the content of an element with the AJAX response
        document.getElementById('home_DraggableDiv').innerHTML = this.responseText;
  
        // Change the URL displayed in the address bar
        history.pushState(null, '', `/${route}`);
        if (typeof callback === 'function') {
          callback(); // Call the callback function if provided
        }

      }
    };
    xhr.send();
  }


  function changePageWithComponent(route, componentId = null, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', `/${route}`, true);
  
    xhr.onload = function() {
      if (this.status === 200) {
        var responseText = this.responseText;
        var targetElement = document.getElementById('home_DraggableDiv');
  
        if (componentId) {
          // Get the HTML element with the specified ID from the AJAX response
          var tempDiv = document.createElement('div');
          tempDiv.innerHTML = responseText;
          var component = tempDiv.querySelector(`#${componentId}`);
  
          // Replace the content of the target element with the new component
          targetElement.innerHTML = component.outerHTML;
        } else {
          // Replace the content of the target element with the entire AJAX response
          targetElement.innerHTML = responseText;
        }
  
        // Change the URL displayed in the address bar
        history.pushState(null, '', `/${route}`);
        if (typeof callback === 'function') {
          callback(); // Call the callback function if provided
        }
      }
    };
  
    xhr.send();
  }