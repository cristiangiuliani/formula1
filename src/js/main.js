// Is possible to add, remove or change seasons list
const   availableSeasons = [2009,2010,2011,2012,2013,2014,2015,2016,2017,2018],
        CACHE = { // Object where to store seasons retrived by http request. 
            seasons: []
        };

// Get the availableSeasons array and build the season menu html
function buildSeasonsList(){
    if(Array.isArray(availableSeasons) && availableSeasons.length > 0){
        let seasonsListRoot = document.getElementById('seasonsList'),
            html = '';
        availableSeasons.forEach((item, index)=>{
            html += `<li>
                        <a href="#" data-season="${item}" tabindex="${index}">
                            <i class="material-icons">keyboard_arrow_right</i>
                            ${item}
                            <i class="material-icons">keyboard_arrow_left</i>
                        </a>
                    </li>`;
        });
        // the last item is the button to access at favorite list
        html += '<li><i id="showFavorites" class="material-icons md-light hidden">favorite_border</i></li>';
        seasonsListRoot.innerHTML = html;

        // I dont like this syntax but Firefox need the event obj as argument inside a callback :(
        seasonsListRoot.addEventListener('click', (event)=>eventWrapper(event,(event)=>getSeason(event,null, renderSeason)), false);
    }
}

/*  
    Event handler. Is possible to set an event at parent node and get the element target without a loop but simply 
    stopping the propagation in the bubbling phase 
*/
function eventWrapper(event,callback) {
    if (event.target !== event.currentTarget) {
        callback(event);
    }
    event.stopPropagation();
}

/*
    Handle the http GET request and retrieve data from server.
*/
function httpHandler(type, url,callback){
    const Http = new XMLHttpRequest();
    let Data = {};
    Http.onreadystatechange = () => {
        if (Http.readyState == 4 && Http.status == 200) {
            try {
                Data = JSON.parse(Http.responseText);                
            } catch(err) {
                console.log(err.message + " in " + Http.responseText);
                return;
            }
            callback(Data);
        }
    };
    Http.open(type, url, true);
    Http.send();
}

/*
    Retrieve data for selected season from http request and save it on cache if not exist. 
    Otherwise get data directly from cache object.
*/
function getSeason(event, season=null,callback){
    
    if(season===null) season = event.target.getAttribute('data-season');

    if(season!==null){
        let url = `http://ergast.com/api/f1/${season}/results/1.json`,
            content = document.getElementsByClassName("content")[0],
            menuItems = document.querySelectorAll('nav a');
        
        // Season not exist in CACHE, get from http request
        if(!CACHE.seasons.hasOwnProperty(season)){
            httpHandler("GET",url,Data=>{
                let races = Data.MRData.RaceTable.Races;
                callback(races);
                // Save it to CACHE for the future
                CACHE.seasons[season] = races;
                console.log('HTTP');
            });
        }else{
            // Season exist in CACHE.
            callback(CACHE.seasons[season]);
            console.log('CACHE');
        }
        if(content.style.opacity == 0) content.style.opacity = 1;
        menuItems.forEach((item,index)=>{
            item.classList.remove("active");
        });
        event.target.classList.add("active");
    }
    toggleMobileMenu();
}

/*
    Get data and generate the HTML code for season table to display.
*/
function renderSeason(races){
    let seasonRaces = document.getElementById('dataPlaceholder'),
        seasonId = "S"+races[0].season;
        html = `<h2>Season ${races[0].season}</h2>
                <div>
                    <table id="${seasonId}"  class="season">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th class="hide-mobile">Date</th>
                                <th class="hide-mobile">Location</th>
                                <th class="hide-mobile">Circuit</th>
                                <th class="hide-mobile">Winner</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>`,
        favorites = localStorage.getObj("favorites");
            
    races.forEach(race=>{
        html += seasonListTemplate(race);
    });
    html += `           </tbody>
                    </table>
                </div>`;
    seasonRaces.innerHTML = html;
    document.getElementById(seasonId).addEventListener('click', (event)=>eventWrapper(event,(event)=>actionsHandler(event)), false);
    document.getElementById("intro").style.display = "none";
}

/*
    Handler for material_design buttons. Check what tipe of button is clicked and call right function
*/
function actionsHandler(event){ 
    if(event.target.innerHTML == "favorite") toggleFavorites(event);
    if(event.target.innerHTML == "info") showRaceDetails(event);
}

/* 
    Toggle favorites updating a localStorage object
*/
function toggleFavorites(event){
    let season = event.target.getAttribute('data-season'),
        race = event.target.getAttribute('data-race'),
        favorites = localStorage.getObj("favorites"),
        favouritesStatus = "remove",
        btnFavoriteList = document.getElementById("showFavorites");
        
    if(checkFavorites(season, race)){
        favorites[season].splice(favorites[season].indexOf(race), 1);
        if(favorites[season].length == 0) delete favorites[season];
        favouritesStatus = "add";
    }else{
        if(!favorites.hasOwnProperty(season)) favorites[season] = [];
        favorites[season].push(race);
    }
    
    localStorage.setObj("favorites", favorites);
    event.target.className = `material-icons ${favouritesStatus}`;
    Object.keys(favorites).length > 0 ? btnFavoriteList.classList.remove('hidden') : btnFavoriteList.classList.add('hidden');
}

/* 
    Check if favorite race is present or not in localStorage object. Used in toggleFavorites function. 
*/
function checkFavorites(season, race){
    if(localStorage.getItem("favoritesExist") === null){
        let tmpObj = {};
        
        localStorage.setObj("favorites", tmpObj);
        localStorage.setItem("favoritesExist","yes");
    } 
    let favorites = localStorage.getObj("favorites");
    
    
    if(favorites.hasOwnProperty(season)){
        if(favorites[season].indexOf(race)!==-1){
            //yes esist in favorite obj
            return true;
        }
    }
    //no, dosn't esist in favorite obj
    return false;
}

/*
    Similar to renderSeason function, this one generate the HTML code for a list of favorites. 
    The data is retrived from localStorage object
*/
function renderFavorites(){
    // The favorites list is stored in localStorage
    let favorites = localStorage.getObj("favorites"),
        html = `<h2>Favorites List</h2>
                <div>
                    <table id="favoritesList" class="favorites">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th class="hide-mobile">Date</th>
                                <th class="hide-mobile">Location</th>
                                <th class="hide-mobile">Circuit</th>
                                <th class="hide-mobile">Winner</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>`;
    Object.keys(favorites).forEach(season=> {
        let races = CACHE.seasons[season]; // retrieve informations to display of races because function get only season and race round
        favorites[season].forEach(race=>{
            races.filter(item => {
                if(item.round === race) html += seasonListTemplate(item);
              });
            
        });
    });
    
    html += `           </tbody>
                    </table>
                </div>`;
    document.getElementById("dataPlaceholder").innerHTML = html;
    document.getElementById("favoritesList").addEventListener('click', (event)=>eventWrapper(event,(event)=>actionsHandler(event)), false);
}

/* 
    Called by renderSeason and renderFavorite, generate the HTML inside the season races list table. 
*/
function seasonListTemplate(race){
    let favouritesStatus = (checkFavorites(race.season, race.round)) ? "remove" : "add",
        raceId = `${race.season}${race.round}`,
        html = `
                <tr>
                    <td class="text-center">
                        <span class="hide-favorites">${race.round}</span>
                        <span class="hide-season">${race.season}</span>
                    </td>
                    <td>
                        ${race.raceName}
                        <ul id="D${raceId}">
                            <li><strong>Date:</strong><br>${formatDate(race.date)}</li>
                            <li><strong>Location:</strong><br>${race.Circuit.Location.locality}, ${race.Circuit.Location.country}</li>
                            <li><strong>Circuit:</strong><br>${race.Circuit.circuitName}</li>
                            <li><strong>Winner:</strong><br>${race.Results[0].Driver.givenName} ${race.Results[0].Driver.familyName}, ${race.Results[0].Constructor.name}</li>
                        </ul>
                    </td>
                    <td class="hide-mobile">${formatDate(race.date)}</td>
                    <td class="hide-mobile">${race.Circuit.Location.locality}, ${race.Circuit.Location.country}</td>
                    <td class="hide-mobile">${race.Circuit.circuitName}</td>
                    <td class="hide-mobile">${race.Results[0].Driver.givenName} ${race.Results[0].Driver.familyName}, ${race.Results[0].Constructor.name}</td>
                    <td><i class="material-icons visible-mobile" data-details="${raceId}">info</i> <i class="material-icons ${favouritesStatus}" data-season="${race.season}" data-race="${race.round}">favorite</i></td>
                </tr>`;
    return html;
}

// Formatting the date of race
function formatDate(strDate){
    let objDate = new Date(strDate),
        months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        day = objDate.getDate() < 10 ? "0"+objDate.getDate() : objDate.getDate();

        return `${day} ${months[objDate.getMonth()]}`
}

// Mobile hamburger menu button handler
function toggleMobileMenu(){    
    if(document.getElementById("mobileMenu").style.display != "none"){
        let mainMenu = document.getElementById("main");
        console.log(mainMenu.style.height);
        if(parseInt(mainMenu.style.height) == 0){
            mainMenu.style.height = "auto";
        }else{
            mainMenu.style.height = "0px";
        }
    }
}

/* 
    In mobile version there is few space for a full table of data. Only race name is displayed and a info button is added.
    On click on info button other race informations are displayed expanding table row
*/
function showRaceDetails(event){
    let detailId = "D" + event.target.getAttribute("data-details")
        detail = document.getElementById(detailId);
        console.log(event.target);
        
    if(detail.style.display == "none" || detail.style.display == ""){
        detail.style.display = "block";
    }else{
        detail.style.display = "none";
    }
}

// Initializations of page on load
window.onload = () => {
    buildSeasonsList(); // build the nav menu
    localStorage.clear(); // reset the favorite list every time the page is reloaded

    /*
        Local storage can store only strings. I've extended the prototype with 2 methods to structurated data as object.
        I do that simply encode and decode object in JSON string
    */
    Storage.prototype.setObj = function(key, obj) {
        return this.setItem(key, JSON.stringify(obj))
    }
    Storage.prototype.getObj = function(key) {
        return JSON.parse(this.getItem(key))
    }
    document.getElementById("main").style.height = "0px";
    document.getElementById("mobileMenu").addEventListener('click', (event)=>toggleMobileMenu(event));
    document.getElementById("showFavorites").addEventListener('click', (event)=>renderFavorites(event));
};