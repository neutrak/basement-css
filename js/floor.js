//floor.js, a javascript library for when you want an experience above that of a basement

const ANIMATION_DURATION_MS=500;
const DISMISS_MOVE_THRESHOLD_PX=40;

//this is the event handler that runs when a page notification starts being dragged
//args:
//	ev: the javascript event that generated this action
//return:
//	returns false always
//side-effects:
//	stores drag state in the window object for later reference
function handle_page_notification_dragstart(ev){
//	console.log('handle_page_notification_dragstart got notification drag start event ',ev); //debug
	
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
function handle_page_notification_dragend(ev,on_dismiss_callback=(ev)=>{}){
//	console.log('handle_page_notification_dragend got notification drag end event ',ev); //debug
	
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
		
//		console.log('handle_page_notification_dragend dismissing notification ev.target=',ev.target,' existing_offset=',existing_offset); //debug
		
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
function handle_page_notification_close_btn(ev,on_dismiss_callback=(ev)=>{}){
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
//return:
//	none
//side-effects:
//	adds a <div class='page-notification fade-in' draggable='true'></div> and associated content to the DOM
//	within each container <div class='page-notification-stack'></div> that the page's html defines
function send_page_notification(page_notification_title,page_notification_message,css_classes='',on_activate_callback=(ev) => {},on_dismiss_callback=(ev) => {}){
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
		
			//intentional intendtation to match generated html's nesting level
			let new_notification_content=document.createElement('DIV');
			new_notification_content.classList.add('page-notification-content');
			new_notification_content.addEventListener('click',on_activate_callback);
			
				//intentional intendtation to match generated html's nesting level
				let new_notification_title=document.createElement('H2');
				new_notification_title.classList.add('page-notification-title');
				new_notification_title.innerText=page_notification_title;
				new_notification_content.appendChild(new_notification_title);
				
				let new_notification_message=document.createElement('P');
				new_notification_message.classList.add('page-notification-message');
				new_notification_message.innerText=page_notification_message;
				new_notification_content.appendChild(new_notification_message);
			
			new_notification.appendChild(new_notification_content);
			
			//on close click or drag-to-dismiss
			let on_dismiss=(ev) => {
				return handle_page_notification_close_btn(ev,on_dismiss_callback);
			};
			
			let new_notification_action_btns=document.createElement('DIV');
			new_notification_action_btns.classList.add('page-notification-action-btns');
			
				let new_notification_close_btn=document.createElement('BUTTON');
				new_notification_close_btn.setAttribute('type','button');
				new_notification_close_btn.classList.add('page-notification-close-btn');
				new_notification_close_btn.innerHTML='&times;';
				new_notification_close_btn.addEventListener('click',on_dismiss);
				new_notification_action_btns.appendChild(new_notification_close_btn);
				
				let new_notification_config_btn=document.createElement('BUTTON');
				new_notification_config_btn.setAttribute('type','button');
				new_notification_config_btn.classList.add('page-notification-config-btn');
				//a cog/config icon
				new_notification_config_btn.innerHTML='<img class="page-notification-icon" src="images/gear.svg">';
				//TODO: add event listener for configuration options
				//which will be:
				//	select notifications to show (checkbox for each type: error, warning, success, info)
				//	timer: off, 1s min, 2s min, 3s min... up to 10s minimum time
				new_notification_config_btn.addEventListener('click',(ev) => {
//					show_page_notification_settings();
				});
				new_notification_action_btns.appendChild(new_notification_config_btn);
			
			new_notification.appendChild(new_notification_action_btns);
		
		//add event listeners for drag-to-dismiss functionality
		//these are applied to the notification element
		new_notification.addEventListener('dragstart',(ev) => {
			return handle_page_notification_dragstart(ev);
		});
		new_notification.addEventListener('dragend',(ev) => {
			return handle_page_notification_dragend(ev,on_dismiss_callback);
		});
		
		/*
		TODO: a timer (horizontal line that shows the progress of time relative to total time of notification on screen)
			on mouse over cancel any timers and consider this notification manually-cancel-only from now on
		TODO: configuration options (keep on screen, etc.) shown by a cog icon
		*/
		
		notification_stacks[stack_idx].appendChild(new_notification);
	}
}

//this function shows the global page notification settings
//args:
//	none
//return:
//	none
//side-effects:
//	shows the page notification dialog in the page notification stack
//	if this dialog is not already present
function show_page_notification_settings(){
	//TODO: add configuration options
	//which will be:
	//	select notifications to show (checkbox for each type: error, warning, success, info)
	//	timer: off, 1s min, 2s min, 3s min... up to 10s minimum time
	
	let notification_stacks=document.querySelectorAll('.page-notification-stack');
	for(let stack_idx=0;stack_idx<notification_stacks.length;stack_idx++){
		
		//if a config dialog is already present then don't show it again
		let existing_notification_settings=notification_stacks[stack_idx].querySelectorAll('.page-notification-config');
		if(existing_notification_settings.length>0){
			//do highlight it though just to focus the user's attention
			for(let setting_idx=0;setting_idx<existing_notification_settings.length;setting_idx++){
				existing_notification_settings[setting_idx].classList.remove('user-attention');
				existing_notification_settings[setting_idx].classList.add('user-attention');
			}
			continue;
		}
		
		let notification_settings_elem=document.createElement('DIV');
		
		notification_stacks[stack_idx].appendChild(notification_settings_elem);
	}
}


