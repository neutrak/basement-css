//page-notification.js, the basement functions to provide page notification functionality

//NOTE: In HTML, this depends on
//	<script type='text/javascript' src='./constants.js'></script>
//	being present FIRST
//	so that constants are defined

//this is the event handler that runs when a page notification starts being dragged
//args:
//	ev: the javascript event that generated this action
//return:
//	returns false always
//side-effects:
//	stores drag state in the window object for later reference
function bsmnt_handle_page_notification_dragstart(ev){
	
	window.active_notification_drag={
		client_x:ev.clientX,
		client_y:ev.clientY,
	};
	
	return false;
}

//this is the event handler that runs when a page notification stops being dragged
//args:
//	ev: the javascript event that generated this action
//	on_dismiss_callback: the callback function to run when a dismissal action occurs
//		on_dismiss_callback, if provided, is a function which takes a single argument
//			ev: the javascript event that generated this action
//return:
//	returns false always
//side-effects:
//	potentially dismisses the notification, if the drag distance was greater than DISMISS_MOVE_THRESHOLD_PX
function bsmnt_handle_page_notification_dragend(ev,on_dismiss_callback=(ev)=>{}){
	
	let is_dismissing=false;
	let dismiss_direction_class='fade-out-right';
	let transform_offset={
		x:(ev.clientX-window.active_notification_drag.client_x),
		y:(ev.clientY-window.active_notification_drag.client_y),
	};
	
	//if you moved the element left or right by at least DISMISS_MOVE_THRESHOLD_PX
	//then this is a dismissal event
	//but how we animate that depends on which direction you moved in
	//so detect direction and apply css accordingly
	if(ev.clientX>=(window.active_notification_drag.client_x+DISMISS_MOVE_THRESHOLD_PX)){
		is_dismissing=true;
		dismiss_direction_class='fade-out-right';
	}else if(ev.clientX<=(window.active_notification_drag.client_x-DISMISS_MOVE_THRESHOLD_PX)){
		is_dismissing=true;
		dismiss_direction_class='fade-out-left';
	}
	
	let existing_offset={
		x:(['',null,undefined].includes(ev.target.style.left)?0:ev.target.style.left.replace('px','')-0),
		y:(['',null,undefined].includes(ev.target.style.top)?0:ev.target.style.top.replace('px','')-0),
	};
	
	if(is_dismissing){
		//run the callback
		on_dismiss_callback(ev);
		
		//set position so nothing moves suddenly or unexpectedly
		ev.target.style.left=existing_offset.x+transform_offset.x+'px';
		ev.target.style.top=existing_offset.y+transform_offset.y+'px';
		
		//remove this notification from the DOM
		//but do so in a pretty way
		ev.target.classList.add('fade-out');
		ev.target.classList.add(dismiss_direction_class);
		
		//NOTE: because we want this to animate away we can't remove it from the DOM until the animation has completed
		//this setTimeout should be for the same time as the duration of the animation
		//so that the item gets cleanly removed from the DOM as soon as it has faded out
		setTimeout(() => {
			ev.target.parentNode.removeChild(ev.target);
		},ANIMATION_DURATION_MS);
	}
	
	//remove unnecessary state so it doesn't clutter the namespace until the next drag
	delete window.active_notification_drag;
	
	return false;
}

//this is the event handler that runs when the user clicks the close button on a notification
//args:
//	ev: the javascript click event which triggered this function call
//	on_dismiss_callback: the callback function to run when a dismissal action occurs
//		on_dismiss_callback, if provided, is a function which takes a single argument
//			ev: the javascript event that generated this action
//return:
//	returns false always
//side-effects:
//	dismisses the associated page notification
function bsmnt_handle_page_notification_close_btn(ev,on_dismiss_callback=(ev)=>{}){
	//run the callback
	on_dismiss_callback(ev);
	
	//stop event propagation
	ev.preventDefault();
	ev.stopPropagation();
	
	let notification_node=ev.target.parentNode.parentNode;
	
	//remove this notification from the DOM
	//but do so in a pretty way
	notification_node.classList.add('fade-out');
	notification_node.classList.add('fade-out-right');
	//NOTE: because we want this to animate away we can't remove it from the DOM until the animation has completed
	//this setTimeout should be for the same time as the duration of the animation
	//so that the item gets cleanly removed from the DOM as soon as it has faded out
	setTimeout(() => {
		notification_node.parentNode.removeChild(notification_node);
	},ANIMATION_DURATION_MS);
	
	return false;
}

//this function sends a page-wide notification to the user
//args:
//	page_notification_title: the title of the notification to show
//	page_notification_message: the main content of the notification to show
//	css_classes: the css classes which determine notification type (success,error,warning,info)
//	on_activate_callback: the optional function to run when the user clicks to select the notification
//	on_dismiss_callback: the optional function to run when the user dismisses or exits from the notification
//	display_time_ms: the number of milliseconds to leave this notification on the screen if the user doesn't interact with it
//		NOTE: mouseover and/or mouseenter events should invalidate this
//		NOTE: we will animate a progress bar to make the duration of notifications apparent to the user
//		NOTE: passing a value of null or 0 will make the notification stay on the screen indefinitely (until the user manually dismisses it)
//return:
//	none
//side-effects:
//	adds a <div class='page-notification fade-in' draggable='true'></div> and associated content to the DOM
//	within each container <div class='page-notification-stack'></div> that the page's html defines
//	unless user-specified settings disabled this notification type (in which case nothing occurs)
function bsmnt_send_page_notification(page_notification_title,page_notification_message,css_classes='',on_activate_callback=(ev) => {},on_dismiss_callback=(ev) => {},display_time_ms=5000){
	//get local page notification settings, if there are any
	let local_notification_settings=localStorage.getItem('page-notification-settings');
	if(local_notification_settings!==null){
		local_notification_settings=JSON.parse(local_notification_settings);
		
		//if a setting was found for this notification type
		if(local_notification_settings.hasOwnProperty('page-notification-setting-enable-'+css_classes)){
			//if this type of notification is disabled
			if(!local_notification_settings['page-notification-setting-enable-'+css_classes]){
				//then do nothing; this notification is disabled!
//				console.log('bsmnt_send_page_notification not sending a notification of type '+css_classes+' because that notification type is disabled by local settings!'); //debug
				return;
			}
		}
	}
	
	//if we got here and didn't return then this notification is either implicitly or explicitly enabled
	//so we're good to now show it anywhere it was requested to be visible
	
	let notification_stacks=document.querySelectorAll('.page-notification-stack');
	for(let stack_idx=0;stack_idx<notification_stacks.length;stack_idx++){
		let new_notification=document.createElement('DIV');
		new_notification.className=css_classes;
		new_notification.classList.add('page-notification');
		new_notification.classList.add('fade-in');
		new_notification.setAttribute('draggable',true);
		setTimeout(() => {
			new_notification.classList.remove('fade-in');
		},ANIMATION_DURATION_MS);
		
			//intentional indentation to match generated html's nesting level
			let new_notification_content=document.createElement('DIV');
			new_notification_content.classList.add('page-notification-content');
			new_notification_content.addEventListener('click',(ev) => {
				//after a click to activate event any timeout active should be cancelled
				if(new_notification.hasOwnProperty('cancel_timeout')){
					new_notification.cancel_timeout();
				}
				
				//and run the user-specified callback function now
				return on_activate_callback(ev);
			});
			
				//intentional indentation to match generated html's nesting level
				let new_notification_title=document.createElement('H2');
				new_notification_title.classList.add('page-notification-title');
				new_notification_title.innerText=page_notification_title;
				new_notification_content.appendChild(new_notification_title);
				
				let new_notification_message=document.createElement('P');
				new_notification_message.classList.add('page-notification-message');
				new_notification_message.innerText=page_notification_message;
				new_notification_content.appendChild(new_notification_message);
			
			new_notification.appendChild(new_notification_content);
			
			let new_notification_action_btns=document.createElement('DIV');
			new_notification_action_btns.classList.add('page-notification-action-btns');
			
				//intentional indentation to match generated html's nesting level
				let close_btn_elem=document.createElement('BUTTON');
				close_btn_elem.setAttribute('type','button');
				close_btn_elem.classList.add('page-notification-close-btn');
				close_btn_elem.innerHTML='&times;';
				//add event listener for on close click
				close_btn_elem.addEventListener('click',(ev) => {
					return bsmnt_handle_page_notification_close_btn(ev,on_dismiss_callback);
				});
				new_notification_action_btns.appendChild(close_btn_elem);
				
				//configuration options (what to show, how long to keep on screen, etc.) indicated by a cog icon
				let config_btn_elem=document.createElement('BUTTON');
				config_btn_elem.setAttribute('type','button');
				config_btn_elem.classList.add('page-notification-config-btn');
				//a cog/config icon
				config_btn_elem.innerHTML='<img class="page-notification-icon" src="images/gear.svg">';
				//add event listener for configuration options
				config_btn_elem.addEventListener('click',(ev) => {
					bsmnt_show_page_notification_settings();
				});
				new_notification_action_btns.appendChild(config_btn_elem);
			
			new_notification.appendChild(new_notification_action_btns);
		
		//add event listeners for drag-to-dismiss functionality
		//these are applied to the notification element
		new_notification.addEventListener('dragstart',(ev) => {
			return bsmnt_handle_page_notification_dragstart(ev);
		});
		new_notification.addEventListener('dragend',(ev) => {
			return bsmnt_handle_page_notification_dragend(ev,on_dismiss_callback);
		});
		
		/*
		a timer (horizontal line that shows the progress of time relative to total time of notification on screen)
		NOTE: on mouse over we cancel any timers and consider this notification manually-cancel-only from now on
		*/
		if((display_time_ms!==null) && (display_time_ms>0)){
			//add a function that we can use to cancel the timeout on this notification from any context
			new_notification.cancel_timeout=() => {
				let progress_bar_elem=new_notification.querySelector('.progress-bar');
				if(progress_bar_elem!==null){
					progress_bar_elem.parentNode.removeChild(progress_bar_elem);
				}
				new_notification.is_timeout_cancelled=true;
			}

			let progress_bar_elem=document.createElement('DIV');
			progress_bar_elem.classList.add('progress-bar');
			new_notification.appendChild(progress_bar_elem);
			setTimeout(() => {
				//animate the progress bar
				progress_bar_elem.style.animation='linear-shrink '+(display_time_ms/MS_PER_SEC)+'s linear';
			});
			
			setTimeout(() => {
				if(new_notification.hasOwnProperty('is_timeout_cancelled') && new_notification.is_timeout_cancelled){
					return;
				}
				new_notification.querySelector('.page-notification-close-btn').click();
			},display_time_ms);
			
			//if the user mouses over a notification then that cancels its associated timeout
			new_notification.addEventListener('mouseover',(ev) => {
				new_notification.cancel_timeout();
			});
		}
		
		notification_stacks[stack_idx].appendChild(new_notification);
	}
}

//this function generates the enable/disable notification settings html
//args:
//	none
//return:
//	returns an HTML element (DIV) which contains the enable/disable settings for all the notification types
//side-effects:
//	none
function bsmnt_gen_page_notification_enable_settings(){
	//define the types of notifications that the user can configure
	//NOTE: this list is ORDERED which is why it's not an object with css classes as keys
	let toggle_notifications_cont=document.createElement('DIV');
	toggle_notifications_cont.classList.add('page-notification-enable-list');
	let notification_types=[
		{
			'css_class':'error',
			'display_name':'Error',
			'dflt_is_checked':true,
		},
		{
			'css_class':'warning',
			'display_name':'Warning',
			'dflt_is_checked':true,
		},
		{
			'css_class':'success',
			'display_name':'Success',
			'dflt_is_checked':true,
		},
		{
			'css_class':'info',
			'display_name':'Info',
			'dflt_is_checked':true,
		},
	];
	
	//get already existing local settings, if there are any
	let local_notification_settings=localStorage.getItem('page-notification-settings');
	if(local_notification_settings!==null){
		local_notification_settings=JSON.parse(local_notification_settings);
	}
	
	//for each notification type
	for(let type_idx=0;type_idx<notification_types.length;type_idx++){
		//create a toggler to enable or disable this type of notification
		let notification_type_toggle_elem=document.createElement('DIV');
		notification_type_toggle_elem.classList.add('toggle-slider');
		
			//intentional indentation to match html nesting level
			let toggle_chkbox=document.createElement('INPUT');
			toggle_chkbox.setAttribute('type','checkbox');
			toggle_chkbox.id='page-notification-setting-enable-'+notification_types[type_idx].css_class;
			
			//on change immediately save the setting to apply it for future notifications
			toggle_chkbox.addEventListener('change',(ev) => {
				//get already existing local settings, if there are any
				let local_notification_settings=localStorage.getItem('page-notification-settings');
				if(local_notification_settings!==null){
					local_notification_settings=JSON.parse(local_notification_settings);
				}else{
					local_notification_settings={};
				}
				
				//store the setting that was actually changed
				local_notification_settings[toggle_chkbox.id]=ev.target.checked;
				
				//save the result in localStorage (which persists between page loads)
				localStorage.setItem('page-notification-settings',JSON.stringify(local_notification_settings));
			});
			
			if(local_notification_settings!==null){
				toggle_chkbox.checked=local_notification_settings[toggle_chkbox.id];
			}else{
				toggle_chkbox.checked=notification_types[type_idx].dflt_is_checked;
			}
			
			notification_type_toggle_elem.appendChild(toggle_chkbox);
			
			let toggle_slider=document.createElement('LABEL');
			toggle_slider.setAttribute('for',toggle_chkbox.id);
			toggle_slider.classList.add('toggle-label');
			notification_type_toggle_elem.appendChild(toggle_slider);
			
			let toggle_label_unchecked=document.createElement('LABEL');
			toggle_label_unchecked.setAttribute('for',toggle_chkbox.id);
			toggle_label_unchecked.classList.add('toggle-label-unchecked');
			toggle_label_unchecked.innerText=notification_types[type_idx]['display_name']+' notifications are disabled';
			notification_type_toggle_elem.appendChild(toggle_label_unchecked);
			
			let toggle_label_checked=document.createElement('LABEL');
			toggle_label_checked.setAttribute('for',toggle_chkbox.id);
			toggle_label_checked.classList.add('toggle-label-checked');
			toggle_label_checked.innerText=notification_types[type_idx]['display_name']+' notifications are enabled';
			notification_type_toggle_elem.appendChild(toggle_label_checked);
		
		toggle_notifications_cont.appendChild(notification_type_toggle_elem);
		
	}
	
	return toggle_notifications_cont;
}

//this function shows the global page notification settings
//args:
//	none
//return:
//	none
//side-effects:
//	shows the page notification dialog in the page notification stack
//	if this dialog is not already present
function bsmnt_show_page_notification_settings(){
	let notification_stacks=document.querySelectorAll('.page-notification-stack');
	for(let stack_idx=0;stack_idx<notification_stacks.length;stack_idx++){
		
		//if a config dialog is already present then don't show it again
		let existing_notification_settings=notification_stacks[stack_idx].querySelectorAll('.page-notification-settings');
		if(existing_notification_settings.length>0){
			//do highlight it though just to focus the user's attention
			for(let setting_idx=0;setting_idx<existing_notification_settings.length;setting_idx++){
				//in order to bring something to the user's attention
				//the thing we're focusing attention on must be visible on the user's screen
				//so scroll it into view in case it's not already
				existing_notification_settings[setting_idx].scrollIntoView();
				
				//pulse at the user to attract their attention
				existing_notification_settings[setting_idx].classList.add('user-attention');
				setTimeout(() => {
					//then stop doing that so as not to be annoying
					existing_notification_settings[setting_idx].classList.remove('user-attention');
				},(ANIMATION_DURATION_MS*(USER_ATTENTION_PULSE_COUNT)));
			}
			continue;
		}
		
		let notification_settings_elem=document.createElement('DIV');
		notification_settings_elem.classList.add('page-notification');
		notification_settings_elem.classList.add('page-notification-settings');
		notification_settings_elem.classList.add('fade-in');
		notification_settings_elem.setAttribute('draggable',true);
		setTimeout(() => {
			notification_settings_elem.classList.remove('fade-in');
			//NOTE: we want to WAIT to get the user's attention until AFTER the fadein has completed
/*			notification_settings_elem.classList.add('user-attention'); */
		},ANIMATION_DURATION_MS);
/*
		//NOTE: user-attention animation pulses 2x then stops
		//so we have to wait 2 animation cycles before removing the class
		//and we DO need to remove it so we can re-add it later and have it animate
		//in case the user clicks the cog again while settings is already open
		setTimeout(() => {
			notification_settings_elem.classList.remove('user-attention');
		},(ANIMATION_DURATION_MS*(USER_ATTENTION_PULSE_COUNT+1)));
*/
		
			//intentional indentation to match generated html's nesting level
			let settings_content_elem=document.createElement('DIV');
			settings_content_elem.classList.add('page-notification-settings-content');
			
				//intentional indentation to match generated html's nesting level
				let title_elem=document.createElement('H2');
				title_elem.classList.add('page-notification-title');
				title_elem.innerText="Page Notification Settings";
				settings_content_elem.appendChild(title_elem);
				
			
			//configuration options
			//	select notifications to show (checkbox for each type: error, warning, success, info)
			let toggle_notifications_cont=bsmnt_gen_page_notification_enable_settings();
			settings_content_elem.appendChild(toggle_notifications_cont);
			
			//TODO: configuration options
			//	min and max times in seconds for timed notifications to stay on the screen (once timed notifications are supported)
			//		<input type="number" step="1" min="0" name="page-notification-min-time">
			//			<button type="button" class="clear-input-field" data-for="page-notification-min-time">&times;</button>
			//		<input type="number" step="1" min="0" name="page-notification-max-time">
			//			<button type="button" class="clear-input-field" data-for="page-notification-max-time">&times;</button>
			
			notification_settings_elem.appendChild(settings_content_elem);
			
			let settings_action_btns=document.createElement('DIV');
			settings_action_btns.classList.add('page-notification-action-btns');
			
				//intentional indentation to match generated html's nesting level
				let close_btn_elem=document.createElement('BUTTON');
				close_btn_elem.setAttribute('type','button');
				close_btn_elem.classList.add('page-notification-close-btn');
				close_btn_elem.innerHTML='&times;';
				//add event listener for on close click
				close_btn_elem.addEventListener('click',(ev) => {
					return bsmnt_handle_page_notification_close_btn(ev);
				});
				settings_action_btns.appendChild(close_btn_elem);
				
				//blank button; a placeholder for layout purposes that actually does nothing
				let blank_btn_elem=document.createElement('BUTTON');
				blank_btn_elem.setAttribute('type','button');
				blank_btn_elem.classList.add('page-notification-blank-btn');
				settings_action_btns.appendChild(blank_btn_elem);
			
			notification_settings_elem.appendChild(settings_action_btns);
		
		//add event listeners for drag-to-dismiss functionality
		notification_settings_elem.addEventListener('dragstart',(ev) => {
			return bsmnt_handle_page_notification_dragstart(ev);
		});
		notification_settings_elem.addEventListener('dragend',(ev) => {
			return bsmnt_handle_page_notification_dragend(ev);
		});
		
		//insert the settings elem at the top of the notification stack
		if(notification_stacks[stack_idx].children.length>0){
			notification_stacks[stack_idx].insertBefore(notification_settings_elem,notification_stacks[stack_idx].children[0]);
		//if the notification stack is empty
		}else{
			//insert it as an only child
			notification_stacks[stack_idx].appendChild(notification_settings_elem);
		}
	}
}


