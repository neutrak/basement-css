//this file contains a set of functions for interacting with basement components
//and at the bottom of this file is an initialization which runs
//any time users have javascript enabled and this file and its dependencies are included

//this function gets the a settings object from localstorage
//for example page notification settings (settings_key='notify-settings')
//args:
//	settings_key: the key within localStorage to access
//return:
//	returns the existing setting object as a javascript object, if an existing setting was found
//	returns an empty object if no existing settings were found
//side-effects:
//	none
function bsmnt_get_local_settings(settings_key='notify-settings'){
	//get already existing local settings, if there are any
	let local_settings=localStorage.getItem(settings_key);
	if(local_settings!==null){
		//we store local settings in json format
		local_settings=JSON.parse(local_settings);
	//if there are no existing local settings
	}else{
		//then create a new empty object which keys can be added to
		local_settings={};
	}
	return local_settings;
}

//this function toggles the banner display on or off
//args:
//	none
//return:
//	none
//side-effects:
//	toggles the banner to be shown or hidden
//		(whichever is the opposite of the state prior to calling this function)
function bsmnt_banner_display_toggle() {
	var banner_elems=document.getElementsByClassName('banner');
	for(var idx=0;idx<banner_elems.length;idx++){
		banner_elems[idx].classList.toggle('hidden');
	}
}

//this function sets an iconbar to be shown or hidden
//args:
//	iconbar_id: the icon bar global unique identifier to show or hide
//	show: true to show, false to hide
//return:
//	none
//side-effects:
//	shows or hides the given iconbar as directed
function bsmnt_set_iconbar_shown(iconbar_id,show) {
	var iconbar=document.getElementById(iconbar_id);
	if(iconbar!==null){
		if(show) {
			iconbar.classList.remove('hidden');
		}else{
			iconbar.classList.add('hidden');
		}
	}
}

//this function opens a basement 'hdr-dropdown-toggle' menu
//args:
//	menu_id: the globally-unique id of the toggle element for the menu to open
//return:
//	none
//side-effects:
//	sets menu toggle checked to true, thus opening the associated dropdown menu
function bsmnt_open_menu(menu_id){
	let menu_toggle=document.getElementById(menu_id);
	if(menu_toggle!==null){
		menu_toggle.checked=true;
	}
}

//this function closes a basement 'hdr-dropdown-toggle' menu
//args:
//	menu_id: the globally-unique id of the toggle element for the menu to close
//return:
//	none
//side-effects:
//	sets menu toggle checked to false, thus closing the associated dropdown menu
function bsmnt_close_menu(menu_id){
	let menu_toggle=document.getElementById(menu_id);
	if(menu_toggle!==null){
		menu_toggle.checked=false;
	}
}

//this function is an event handler for the click event on the body element
//it serves to close any currently-open menus when such a click occurs
//args:
//	ev: the javascript click event that triggered this function to run
//return:
//	none
//side-effects:
//	closes any open menus that this click is outside of
function bsmnt_hndl_body_click(ev) {
	let menu_toggles=document.getElementsByClassName('hdr-dropdown-toggle');
	for(let toggle_idx=0;toggle_idx<menu_toggles.length;toggle_idx++){
		let menu_id=menu_toggles[toggle_idx].id;
		
		let menu_toggle=document.getElementById(menu_id);
		//if the main menu is currently open
		if(menu_toggle!==null && menu_toggle.checked){
			//check if this click event was within the menu
			let is_menu_click=false;
			let elem=ev.target;
			while(elem.parentNode!==null){
				//if this click was within some kind of header menu (but not necessarily the one we're checking)
				if(elem.classList.contains('hdr-nav-menu')){
					//if the toggle is a sibling somewhere within that
					if(elem.querySelector('#'+menu_id)!==null){
						//then this click occurred somewhere within the menu we're considering
						is_menu_click=true;
						break;
					}
				}
				elem=elem.parentNode;
			}
			//if this click event was not within the menu itself
			if(!is_menu_click){
				//close the menu
				bsmnt_close_menu(menu_id);
			}
		}
	}
}

//this is the initialization function for the basement css and component library
//args:
//	ev: the load event from the DOM window object
//return:
//	none
//side-effects:
//	un-hides all yes-js elements and performs initialization for any basement components found in the DOM on page load
window.addEventListener('load',function (ev) {
	//this un-hides js-specific elements on page load
	//which by default are hidden, since for clients that don't support javascript we don't display them
	var js_elems=document.getElementsByClassName('yes-js');
	//NOTE: because elements get removed from the js_elems list once we remove the yes-js class
	//this is a check for while js_elems exist rather than a for loop with an index of the element
	while(js_elems.length>0){
		js_elems[0].classList.remove('yes-js');
	}
	
	//close the menu when the user clicks elsewhere
	document.body.addEventListener('click',bsmnt_hndl_body_click);
	
	//prevent default dragover behaviour so that drag to dismiss notifications works as expected
	//at least so long as you leave them with the drag-outabble area
/*
	let page_notification_stack_conts=document.querySelectorAll('.page-notification-stack-cont');
	for(let idx=0;idx<page_notification_stack_conts.length;idx++){
		page_notification_stack_conts[idx].addEventListener('dragover', (ev) => {
			ev.preventDefault();
		});
	}
*/
	//NOTE: as far as I can tell this /must/ be global
	//or we get ghost images where we don't want them
	//sorry if that causes conflicts :/
	document.addEventListener('dragover', (ev) => {
		ev.preventDefault();
	});
});

