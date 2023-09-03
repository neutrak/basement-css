//notify.js, the basement functions to provide page notification functionality

//NOTE: In HTML, this depends on
//	<script type='text/javascript' src='./constants.js'></script>
//	being present on the page FIRST
//	so that constants are defined

//this is the event handler that runs when a page notification starts being dragged
//args:
//	ev: the javascript event that generated this action
//return:
//	returns false always
//side-effects:
//	stores drag state in the window object for later reference
function bsmnt_hndl_notify_dragstart(ev){
	
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
function bsmnt_hndl_notify_dragend(ev,on_dismiss_callback=(ev)=>{}){
	
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
function bsmnt_hndl_notify_close_click(ev,on_dismiss_callback=(ev)=>{}){
	//run the callback
	on_dismiss_callback(ev);
	
	//stop event propagation
	ev.preventDefault();
	ev.stopPropagation();
	
	let notify_node=ev.target.parentNode.parentNode;
	
	//remove this notification from the DOM
	//but do so in a pretty way
	notify_node.classList.add('fade-out');
	notify_node.classList.add('fade-out-right');
	//NOTE: because we want this to animate away we can't remove it from the DOM until the animation has completed
	//this setTimeout should be for the same time as the duration of the animation
	//so that the item gets cleanly removed from the DOM as soon as it has faded out
	setTimeout(() => {
		if(notify_node.parentNode!==null){
			notify_node.parentNode.removeChild(notify_node);
		}
	},ANIMATION_DURATION_MS);
	
	return false;
}

//this function sends a page-wide notification to the user
//args:
//	notification_title: the title of the notification to show
//	notification_message: the main content of the notification to show
//	css_classes: the css classes which determine notification type (success,error,warning,info)
//	display_time_ms: the number of milliseconds to leave this notification on the screen if the user doesn't interact with it
//		NOTE: mouseover and/or mouseenter events should invalidate this
//		NOTE: we will animate a progress bar to make the duration of notifications apparent to the user
//		NOTE: passing a value of null or 0 will make the notification stay on the screen indefinitely (until the user manually dismisses it)
//		NOTE: user configuration can influence min and max time of notifications and over-ride arguments to this function
//	on_activate_callback: the optional function to run when the user clicks to select the notification
//	on_dismiss_callback: the optional function to run when the user dismisses or exits from the notification
//return:
//	none
//side-effects:
//	adds a <div class='notify fade-in' draggable='true'></div> and associated content to the DOM
//	within each container <div class='notify-stack'></div> that the page's html defines
//	unless user-specified settings disabled this notification type (in which case nothing occurs)
function bsmnt_notify(notification_title,notification_message,css_classes='',display_time_ms=5000,on_activate_callback=(ev) => {},on_dismiss_callback=(ev) => {}){
	//get local page notification settings, if there are any
	let local_notify_settings=bsmnt_get_local_settings('notify-settings');
	
	//if an enable/disable setting was found for this notification type
	if(local_notify_settings.hasOwnProperty('notify-setting-enable-'+css_classes)){
		//if this type of notification is disabled
		if(!local_notify_settings['notify-setting-enable-'+css_classes]){
			//then do nothing; this notification is disabled!
//			console.log('bsmnt_notify not sending a notification of type '+css_classes+' because that notification type is disabled by local settings!'); //debug
			return;
		}
	}
	
	//if we got here and didn't return then this notification is either implicitly or explicitly enabled
	//so we're good to now show it anywhere it was requested to be visible
	
	//enforce min time if specified
	let min_time=null;
	if(local_notify_settings.hasOwnProperty('notify-min-time')){
		min_time=local_notify_settings['notify-min-time'];
		if((min_time!==null) && (min_time>0)){
			if((display_time_ms)<(min_time*MS_PER_SEC)){
				display_time_ms=(min_time*MS_PER_SEC);
			}
		}
	}
	
	//enforce max time if specified
	let max_time=null;
	if(local_notify_settings.hasOwnProperty('notify-max-time')){
		max_time=local_notify_settings['notify-max-time'];
		//NOTE: if min_time>max_time then max_time is IGNORED
		if((max_time!==null) && (max_time>0) && ((min_time===null) || (min_time<max_time))){
			if((display_time_ms)>(max_time*MS_PER_SEC)){
				display_time_ms=(max_time*MS_PER_SEC);
			}
		}
	}
	
	let notify_stacks=document.querySelectorAll('.notify-stack');
	for(let stack_idx=0;stack_idx<notify_stacks.length;stack_idx++){
		let new_notification=document.createElement('DIV');
		new_notification.className=css_classes;
		new_notification.classList.add('notification');
		new_notification.classList.add('fade-in');
		new_notification.setAttribute('draggable',true);
		setTimeout(() => {
			new_notification.classList.remove('fade-in');
		},ANIMATION_DURATION_MS);
		
			//intentional indentation to match generated html's nesting level
			let new_notification_content=document.createElement('DIV');
			new_notification_content.classList.add('notify-content');
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
				new_notification_title.classList.add('notification-title');
				new_notification_title.innerText=notification_title;
				new_notification_content.appendChild(new_notification_title);
				
				let new_notification_message=document.createElement('P');
				new_notification_message.classList.add('notification-message');
				new_notification_message.innerText=notification_message;
				new_notification_content.appendChild(new_notification_message);
			
			new_notification.appendChild(new_notification_content);
			
			let new_notification_action_btns=document.createElement('DIV');
			new_notification_action_btns.classList.add('notify-action-btns');
			
				//intentional indentation to match generated html's nesting level
				let close_btn_elem=document.createElement('BUTTON');
				close_btn_elem.setAttribute('type','button');
				close_btn_elem.classList.add('notify-close-btn');
				close_btn_elem.innerHTML='&times;';
				//add event listener for on close click
				close_btn_elem.addEventListener('click',(ev) => {
					return bsmnt_hndl_notify_close_click(ev,on_dismiss_callback);
				});
				new_notification_action_btns.appendChild(close_btn_elem);
				
				//configuration options (what to show, how long to keep on screen, etc.) indicated by a cog icon
				let config_btn_elem=document.createElement('BUTTON');
				config_btn_elem.setAttribute('type','button');
				config_btn_elem.classList.add('notify-config-btn');
				//a cog/config icon
				config_btn_elem.innerHTML='<img class="notify-icon" src="images/gear.svg">';
				//add event listener for configuration options
				config_btn_elem.addEventListener('click',(ev) => {
					bsmnt_show_notify_settings();
				});
				new_notification_action_btns.appendChild(config_btn_elem);
			
			new_notification.appendChild(new_notification_action_btns);
		
		//add event listeners for drag-to-dismiss functionality
		//these are applied to the notification element
		new_notification.addEventListener('dragstart',(ev) => {
			return bsmnt_hndl_notify_dragstart(ev);
		});
		new_notification.addEventListener('dragend',(ev) => {
			return bsmnt_hndl_notify_dragend(ev,on_dismiss_callback);
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
				new_notification.querySelector('.notify-close-btn').click();
			},display_time_ms);
			
			//if the user mouses over a notification then that cancels its associated timeout
			new_notification.addEventListener('mouseover',(ev) => {
				new_notification.cancel_timeout();
			});
		}
		
		notify_stacks[stack_idx].appendChild(new_notification);
	}
}

//this function generates the enable/disable notification settings html
//args:
//	none
//return:
//	returns an HTML element (DIV) which contains the enable/disable settings for all the notification types
//side-effects:
//	none
function bsmnt_gen_notify_enable_settings(){
	//define the types of notifications that the user can configure
	//NOTE: this list is ORDERED which is why it's not an object with css classes as keys
	let toggle_notifications_cont=document.createElement('DIV');
	toggle_notifications_cont.classList.add('notify-enable-list');
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
	let local_notify_settings=bsmnt_get_local_settings('notify-settings');
	
	//for each notification type
	for(let type_idx=0;type_idx<notification_types.length;type_idx++){
		//create a toggler to enable or disable this type of notification
		let notification_type_toggle_elem=document.createElement('DIV');
		notification_type_toggle_elem.classList.add('toggle-slider');
		
			//intentional indentation to match html nesting level
			let toggle_chkbox=document.createElement('INPUT');
			toggle_chkbox.setAttribute('type','checkbox');
			toggle_chkbox.id='notify-setting-enable-'+notification_types[type_idx].css_class;
			
			//on change immediately save the setting to apply it for future notifications
			toggle_chkbox.addEventListener('change',(ev) => {
				//get already existing local settings, if there are any
				let local_notify_settings=bsmnt_get_local_settings('notify-settings');
				
				//store the setting that was actually changed
				local_notify_settings[toggle_chkbox.id]=ev.target.checked;
				
				//save the result in localStorage (which persists between page loads)
				localStorage.setItem('notify-settings',JSON.stringify(local_notify_settings));
			});
			
			if(local_notify_settings.hasOwnProperty(toggle_chkbox.id)){
				toggle_chkbox.checked=local_notify_settings[toggle_chkbox.id];
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

//this function generates the timeout notification settings html
//args:
//	none
//return:
//	returns an HTML element (DIV) which contains the page notification timeout settings
//side-effects:
//	none
function bsmnt_gen_notify_timeout_settings(){
	let timeout_notifications_cont=document.createElement('DIV');
	timeout_notifications_cont.classList.add('notify-timeout-settings');
	
	//get already existing local settings, if there are any
	let local_notify_settings=bsmnt_get_local_settings('notify-settings');
	
	//configuration options
	//	min and max times in seconds for timed notifications to stay on the screen (once timed notifications are supported)
	//		<div>
	//			<input type="number" step="1" min="0" name="notify-min-time">
	//			<button type="button" class="clear-input-field">&times;</button>
	//		</div>
	//		<div>
	//			<input type="number" step="1" min="0" name="notify-max-time">
	//			<button type="button" class="clear-input-field">&times;</button>
	//		</div>
	
		//intentional indentation to match html nesting level
		let min_time_cont=document.createElement('DIV');
		min_time_cont.classList.add('timeout-input-cont');
			
			//intentional indentation to match html nesting level
			let min_time_elem=document.createElement('INPUT');
			min_time_elem.setAttribute('type','number');
			min_time_elem.setAttribute('step','1');
			min_time_elem.setAttribute('min','0');
			min_time_elem.setAttribute('name','notify-min-time');
			min_time_elem.setAttribute('placeholder','Minimum notification seconds');
			if(local_notify_settings.hasOwnProperty('notify-min-time')){
				min_time_elem.value=local_notify_settings['notify-min-time'];
			}
			min_time_elem.addEventListener('change',(ev) => {
				let min_time=ev.target.value;
				
				//get already existing local settings, if there are any
				let local_notify_settings=bsmnt_get_local_settings('notify-settings');
				
				//if a valid nonzero min time was not specified
				if((min_time<0) || (min_time==='')){
					if(min_time!==''){
						bsmnt_notify(
							'Min timeout time invalid',
							'Min timeout time must be greater than or equal to 0s; values which are negative will be ignored',
							'warning',
						);
					}
					
					//then this setting should no longer be present at all
					if(local_notify_settings.hasOwnProperty('notify-min-time')){
						delete local_notify_settings['notify-min-time']
					}
				//if a valid nonzero min time WAS specified, then save it
				}else{
					//if max_time is already specified and min_time>max_time
					//then let the user know that we're going to prefer the min time over the max time
					//and ignore the max time setting
					let max_time=(local_notify_settings.hasOwnProperty('notify-max-time'))?(local_notify_settings['notify-max-time']):null;
					if((max_time!==null) && (min_time-0)>(max_time-0)){
						
						//we want to notify the user of something, and we are in a notification system
						//so um, send them a notification; how handy!
						bsmnt_notify(
							'Max timeout time invalid',
							'Max timeout time must be greater than the configured minimum timeout time ('+min_time+'s)',
							'warning',
						);
					}
					
					//the -0 here just converts the type to a number
					local_notify_settings['notify-min-time']=min_time-0;
				}
				
				//save the result in localStorage (which persists between page loads)
				localStorage.setItem('notify-settings',JSON.stringify(local_notify_settings));
			});
			min_time_cont.appendChild(min_time_elem);
			
			let min_time_clear_btn=document.createElement('BUTTON');
			min_time_clear_btn.setAttribute('type','button');
			min_time_clear_btn.classList.add('clear-input-field');
			min_time_clear_btn.innerHTML='&times;';
			min_time_clear_btn.addEventListener('click',(ev) => {
				//if the min time input element is ALREADY cleared out
				if(min_time_elem.value===''){
					//bring it to the user's attention
					
					//NOTE: this shouldn't be necessary because of where we place the clear buttons
					//but is done just for good measure to the input field is in view
					min_time_elem.scrollIntoView();
					
					//pulse at the user to attract their attention
					min_time_elem.classList.add('user-attention');
					setTimeout(() => {
						//then stop doing that so as not to be annoying
						min_time_elem.classList.remove('user-attention');
					},(ANIMATION_DURATION_MS*(USER_ATTENTION_PULSE_COUNT)));
					return;
				}
				
				min_time_elem.value='';
				let chng_evnt=new Event('change');
				min_time_elem.dispatchEvent(chng_evnt);
			});
			min_time_cont.appendChild(min_time_clear_btn);
		
		timeout_notifications_cont.appendChild(min_time_cont);
		
		//intentional indentation to match html nesting level
		let max_time_cont=document.createElement('DIV');
		max_time_cont.classList.add('timeout-input-cont');
		
			//intentional indentation to match html nesting level
			let max_time_elem=document.createElement('INPUT');
			max_time_elem.setAttribute('type','number');
			max_time_elem.setAttribute('step','1');
			max_time_elem.setAttribute('min','0');
			max_time_elem.setAttribute('name','notify-max-time');
			max_time_elem.setAttribute('placeholder','Maximum notification seconds');
			if(local_notify_settings.hasOwnProperty('notify-max-time')){
				max_time_elem.value=local_notify_settings['notify-max-time'];
			}
			max_time_elem.addEventListener('change',(ev) => {
				let max_time=ev.target.value;
				
				//get already existing local settings, if there are any
				let local_notify_settings=bsmnt_get_local_settings('notify-settings');
				
				//if a valid nonzero max time was not specified
				if((max_time<=0) || (max_time==='')){
					if(max_time!==''){
						bsmnt_notify(
							'Max timeout time invalid',
							'Max timeout time must be greater than 0s; values which are not positive will be ignored',
							'warning',
						);
					}
					
					//then this setting should no longer be present at all
					if(local_notify_settings.hasOwnProperty('notify-max-time')){
						delete local_notify_settings['notify-max-time']
					}
				//if a valid nonzero max time WAS specified, then save it
				}else{
					//if min_time is already specified and min_time>max_time
					//then set this input as invalid because the associated max_time value will be IGNORED
					//and the user should be informed of that fact
					let min_time=(local_notify_settings.hasOwnProperty('notify-min-time'))?(local_notify_settings['notify-min-time']):null;
					if((min_time!==null) && (min_time-0)>(max_time-0)){
						
						//we want to notify the user of something, and we are in a notification system
						//so um, send them a notification; how handy!
						bsmnt_notify(
							'Max timeout time invalid',
							'Max timeout time must be greater than the configured minimum timeout time ('+min_time+'s)',
							'warning',
						);
					}
					
					//the -0 here just converts the type to a number
					local_notify_settings['notify-max-time']=max_time-0;
				}
				
				//save the result in localStorage (which persists between page loads)
				localStorage.setItem('notify-settings',JSON.stringify(local_notify_settings));
			});
			max_time_cont.appendChild(max_time_elem);
			
			let max_time_clear_btn=document.createElement('BUTTON');
			max_time_clear_btn.setAttribute('type','button');
			max_time_clear_btn.classList.add('clear-input-field');
			max_time_clear_btn.innerHTML='&times;';
			max_time_clear_btn.addEventListener('click',(ev) => {
				//if the min time input element is ALREADY cleared out
				if(max_time_elem.value===''){
					//bring it to the user's attention
					
					//NOTE: this shouldn't be necessary because of where we place the clear buttons
					//but is done just for good measure to the input field is in view
					max_time_elem.scrollIntoView();
					
					//pulse at the user to attract their attention
					max_time_elem.classList.add('user-attention');
					setTimeout(() => {
						//then stop doing that so as not to be annoying
						max_time_elem.classList.remove('user-attention');
					},(ANIMATION_DURATION_MS*(USER_ATTENTION_PULSE_COUNT)));
					return;
				}
				
				max_time_elem.value='';
				let chng_evnt=new Event('change');
				max_time_elem.dispatchEvent(chng_evnt);
			});
			max_time_cont.appendChild(max_time_clear_btn);
		
		timeout_notifications_cont.appendChild(max_time_cont);
	
	return timeout_notifications_cont;
}

//this function shows the global page notification settings
//args:
//	none
//return:
//	none
//side-effects:
//	shows the page notification dialog in the page notification stack
//	if this dialog is not already present
function bsmnt_show_notify_settings(){
	let notify_stacks=document.querySelectorAll('.notify-stack');
	for(let stack_idx=0;stack_idx<notify_stacks.length;stack_idx++){
		
		//if a config dialog is already present then don't show it again
		let existing_notify_settings=notify_stacks[stack_idx].querySelectorAll('.notify-settings');
		if(existing_notify_settings.length>0){
			//do highlight it though just to focus the user's attention
			for(let setting_idx=0;setting_idx<existing_notify_settings.length;setting_idx++){
				//in order to bring something to the user's attention
				//the thing we're focusing attention on must be visible on the user's screen
				//so scroll it into view in case it's not already
				existing_notify_settings[setting_idx].scrollIntoView();
				
				//pulse at the user to attract their attention
				existing_notify_settings[setting_idx].classList.add('user-attention');
				setTimeout(() => {
					//then stop doing that so as not to be annoying
					existing_notify_settings[setting_idx].classList.remove('user-attention');
				},(ANIMATION_DURATION_MS*(USER_ATTENTION_PULSE_COUNT)));
			}
			continue;
		}
		
		let notify_settings_elem=document.createElement('DIV');
		notify_settings_elem.classList.add('notification');
		notify_settings_elem.classList.add('notify-settings');
		notify_settings_elem.classList.add('fade-in');
		notify_settings_elem.setAttribute('draggable',true);
		setTimeout(() => {
			notify_settings_elem.classList.remove('fade-in');
		},ANIMATION_DURATION_MS);
		
			//intentional indentation to match generated html's nesting level
			let settings_content_elem=document.createElement('DIV');
			settings_content_elem.classList.add('notify-settings-content');
			
				//intentional indentation to match generated html's nesting level
				let title_elem=document.createElement('H2');
				title_elem.classList.add('notification-title');
				title_elem.innerText="Page Notification Settings";
				settings_content_elem.appendChild(title_elem);
				
			
			//configuration options
			//	select notifications to show (checkbox for each type: error, warning, success, info)
			let toggle_notifications_cont=bsmnt_gen_notify_enable_settings();
			settings_content_elem.appendChild(toggle_notifications_cont);
			
			//configuration options
			//	min and max times in seconds for timed notifications to stay on the screen
			let timeout_notifications_cont=bsmnt_gen_notify_timeout_settings();
			settings_content_elem.appendChild(timeout_notifications_cont);
			
			notify_settings_elem.appendChild(settings_content_elem);
			
			let settings_action_btns=document.createElement('DIV');
			settings_action_btns.classList.add('notify-action-btns');
			
				//intentional indentation to match generated html's nesting level
				let close_btn_elem=document.createElement('BUTTON');
				close_btn_elem.setAttribute('type','button');
				close_btn_elem.classList.add('notify-close-btn');
				close_btn_elem.innerHTML='&times;';
				//add event listener for on close click
				close_btn_elem.addEventListener('click',(ev) => {
					return bsmnt_hndl_notify_close_click(ev);
				});
				settings_action_btns.appendChild(close_btn_elem);
			
			notify_settings_elem.appendChild(settings_action_btns);
		
		//add event listeners for drag-to-dismiss functionality
		notify_settings_elem.addEventListener('dragstart',(ev) => {
			return bsmnt_hndl_notify_dragstart(ev);
		});
		notify_settings_elem.addEventListener('dragend',(ev) => {
			return bsmnt_hndl_notify_dragend(ev);
		});
		
		//insert the settings elem at the top of the notification stack
		if(notify_stacks[stack_idx].children.length>0){
			notify_stacks[stack_idx].insertBefore(notify_settings_elem,notify_stacks[stack_idx].children[0]);
		//if the notification stack is empty
		}else{
			//insert it as an only child
			notify_stacks[stack_idx].appendChild(notify_settings_elem);
		}
	}
}


