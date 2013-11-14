function Peppermint(_this, options) {
	var o = options || {};

	o.speed = o.speed || 300; // transition between slides in ms
	o.touchSpeed = o.touchSpeed || 300; // transition between slides in ms after touch
	o.slideshow = o.slideshow || false;
	o.slideshowInterval = o.slideshowInterval || 4000;
	o.stopSlideshowAfterInteraction = o.stopSlideshowAfterInteraction || false;
	o.startSlide = o.startSlide || 0;
	o.dots = o.dots || false;
	o.dotsFirst = o.dotsFirst || false;
	o.mouseDrag = o.mouseDrag || false;
	o.cssPrefix = o.cssPrefix || '';

	var classes = {
		active: o.cssPrefix + 'active',
		mouse: o.cssPrefix + 'mouse',
		drag: o.cssPrefix + 'drag'
	}
	
	var slider = {
			slides: [],
			dots: [],
			left: 0
		},
		slidesNumber,
		flickThreshold = 200, // Maximum time in ms for flicks
		activeSlide,
		slideWidth,
		dotBlock,
		slideBlock,
		slideshowTimeoutId,
		slideshowActive,
		animationTimer;

	// feature detects
	var support = {
		pointerEvents: !!window.navigator.pointerEnabled,
		msPointerEvents: !!window.navigator.msPointerEnabled,
		transforms: testProp('transform'),
		transitions: testProp('transition')
	}

	function testProp(prop) {
		var prefixes = ['Webkit', 'Moz', 'O', 'ms'],
			block = document.createElement('div');

		if (block.style[prop] !== undefined) return true;

		prop = prop.charAt(0).toUpperCase() + prop.slice(1);
		for (var i in prefixes) {
			if (block.style[prefixes[i]+prop] !== undefined) return true;
		}

		return false;
	}

	function addClass(el, cl) {
		el.className = (el.className + ' ' + cl).replace(/^\s+|\s+$/g, '');
	}

	function removeClass(el, cl) {
		el.className = (' ' + el.className + ' ').replace(' ' + cl + ' ', '').replace(/^\s+|\s+$/g, '');
	}

	//n - slide number (starting from 0)
	//speed - transition in ms, can be omitted
	function changeActiveSlide(n, speed) {
		if (n<0) {
			n = 0;
		}
		else if (n>slidesNumber-1) {
			n = slidesNumber-1;
		}
		
		if (n !== activeSlide) {
			//change active dot
			for (var i = slider.dots.length - 1; i >= 0; i--) {
				removeClass(slider.dots[i], classes.active);
			}

			addClass(slider.dots[n], classes.active);

			activeSlide = n;
		}

		changePos(-n*slider.width, (speed===undefined?o.speed:speed));

		//reset slideshow timeout whenever active slide is changed for whatever reason
		stepSlideshow();

		//API callback
		o.onSlideChange && o.onSlideChange(n);

		return n;
	}

	//changes position (in px) of the slider
	function changePos(pos, speed) {
		var time = speed?speed+'ms':'';

		slideBlock.style.webkitTransitionDuration = 
		slideBlock.style.MozTransitionDuration = 
		slideBlock.style.msTransitionDuration = 
		slideBlock.style.OTransitionDuration = 
		slideBlock.style.transitionDuration = time;

		setPos(pos);
	}

	function changePosFallback(pos, speed) {
		animationTimer && clearInterval(animationTimer);

		if (!speed) {
			setPos(pos);
			return;
		}

		var startTime = +new Date,
			startPos = slider.left;

		animationTimer = setInterval(function() {
			var elapsed = +new Date - startTime;
			
			if (elapsed > speed) {
				setPos(pos);
				clearInterval(animationTimer);
				return;
			}
		
			setPos(Math.floor(((pos - startPos) * (elapsed / speed) + startPos)));
	    }, 15);
	}

	function setPos(pos) {
		slideBlock.style.webkitTransform = 'translate('+pos+'px,0) translateZ(0)';
		slideBlock.style.msTransform = 
		slideBlock.style.MozTransform = 
		slideBlock.style.OTransform = 
		slideBlock.style.transform = 'translateX('+pos+'px)';

		slider.left = pos;
	}

	function setPosFallback(pos) {
		slideBlock.style.left = pos+'px';

		slider.left = pos;
	}

	function nextSlide() {
		var n = activeSlide + 1;

		if (n > slidesNumber - 1) {
			n = 0;
		}

		return changeActiveSlide(n);
	}

	function prevSlide() {
		var n = activeSlide - 1;

		if (n < 0) {
			n = slidesNumber - 1;
		}

		return changeActiveSlide(n);
	}

	function startSlideshow() {
		slideshowActive = true;
		stepSlideshow();
	}

	//sets or resets timeout to the next slide
	function stepSlideshow() {
		if (slideshowActive) {
			slideshowTimeoutId && clearTimeout(slideshowTimeoutId);

			slideshowTimeoutId = setTimeout(function() {
				nextSlide();
			},
			o.slideshowInterval);
		}
	}

	//pauses slideshow until `stepSlideshow` is invoked
	function pauseSlideshow() {
		slideshowTimeoutId && clearTimeout(slideshowTimeoutId);
	}

	function stopSlideshow() {
		slideshowActive = false;
		slideshowTimeoutId && clearTimeout(slideshowTimeoutId);
	}

	//inits touch events
	function touchInit() {
		var start = {},
			diff = {},
			isScrolling,
			eventType,
			clicksAllowed = true,
			eventModel = (support.pointerEvents? 1 : (support.msPointerEvents? 2 : 0)),
			events = [
				['touchstart', 'touchmove', 'touchend', 'touchcancel'],
				['pointerdown', 'pointermove', 'pointerup', 'pointercancel'],
				['MSPointerDown', 'MSPointerMove', 'MSPointerUp', 'MSPointerCancel'],
				['mousedown', 'mousemove', 'mouseup', false]
			],
			checks = [
				function(e) {
					//if it's multitouch or pinch move -- do nothing
					return (e.touches && e.touches.length > 1) || (e.scale && e.scale !== 1);
				},
				function(e) {
					return !e.isPrimary || (!o.mouseDrag && e.pointerType !== 'touch' && e.pointerType !== 'pen');
				},
				function(e) {
					return !e.isPrimary || (!o.mouseDrag && e.pointerType !== e.MSPOINTER_TYPE_TOUCH && e.pointerType !== e.MSPOINTER_TYPE_PEN);
				},
				function() {return false;}
			];

		function tStart(event, eType) {
			clicksAllowed = true;
			eventType = eType;

			if (checks[eventType](event)) return;

			addEvent(document, events[eventType][1], tMove, false);
			addEvent(document, events[eventType][2], tEnd, false);
			addEvent(document, events[eventType][3], tEnd, false);

			//fixes WebKit's cursor while dragging
			if (eventType) event.preventDefault? event.preventDefault() : event.returnValue = false;

			//remember starting time and position
			start = {
				x: eventType? event.clientX : event.touches[0].clientX,
				y: eventType? event.clientY : event.touches[0].clientY,

				time: +new Date
			};
			
			addClass(_this, classes.drag);

			//reset
			isScrolling = undefined;
			diff = {};
		}

		function tMove(event) {
			//if user is trying to scroll vertically -- do nothing
			if (isScrolling || checks[eventType](event)) return;

			diff.x = (eventType? event.clientX : event.touches[0].clientX) - start.x;

			if (diff.x) clicksAllowed = false;

			//check whether the user is trying to scroll vertically
			if (eventType !== 3 && isScrolling === undefined) {
				//`diff.y` is only required for this check
				diff.y = (eventType? event.clientY : event.touches[0].clientY) - start.y;
				//assign and check `isScrolling` at the same time
				if (isScrolling = (Math.abs(diff.x) < Math.abs(diff.y))) return;
			}

			event.preventDefault? event.preventDefault() : event.returnValue = false; //Prevent scrolling
			pauseSlideshow(); //pause slideshow when touch is in progress

			//if it's first slide and moving left or last slide and moving right -- resist!
			diff.x = 
			diff.x / 
				(
					(!activeSlide && diff.x > 0
					|| activeSlide == slidesNumber - 1 && diff.x < 0)
					?                      
					(Math.abs(diff.x)/slider.width*3 + 1)
					:
					1
				);
			
			//change the position of the slider appropriately
			changePos(diff.x - slider.width*activeSlide);
		}

		function tEnd(event) {
			//IE likes to focus the link after touchend.
			//I dont' want to disable the outline completely for accessibility reasons,
			//so I just defocus it after touch and disable the outline for `:active` link in css.
			//This way the outline will remain visible when tabbing through the links.
			event.target && event.target.blur && event.target.blur();
			
			if (isScrolling || checks[eventType](event)) return;

			if (diff.x) {
				//duration of the touch move
				var duration = Number(+new Date - start.time);
				//whether it was a flick move or not
				var ratio = Math.abs(diff.x)/slider.width, 
					skip = Math.floor(ratio) + (ratio - Math.floor(ratio) > 0.25?1:0),
					flick = duration < flickThreshold+flickThreshold*skip/1.8 && Math.abs(diff.x) - skip*slider.width > (skip?-slider.width/9:30);

				skip += (flick?1:0);

				if (diff.x < 0) {
					changeActiveSlide(activeSlide+skip, o.touchSpeed);
				}
				else {
					changeActiveSlide(activeSlide-skip, o.touchSpeed);	
				}

				o.stopSlideshowAfterInteraction && stopSlideshow();
			}

			removeClass(_this, classes.drag);

			detachEvents();
		}

		function detachEvents() {
			removeEvent(document, events[eventType][1], tMove, false);
			removeEvent(document, events[eventType][2], tEnd, false);
		}

		//bind the events
		addEvent(slideBlock, events[eventModel][0], function(e) {tStart(e, eventModel);}, false);
		addEvent(slideBlock, 'dragstart', function(e){e.preventDefault();}, false);

		if (o.mouseDrag && !eventModel) {
			addEvent(slideBlock, events[3][0], function(e) {tStart(e, 3);}, false);
		}

		//No clicking during touch for IE
		addEvent(slideBlock, 'click', function(event) {
			clicksAllowed || (event.preventDefault? event.preventDefault() : event.returnValue = false);
		}, false);
	}
	
	//this should be invoked when the width of the slider is changed
	function onWidthChange() {
		slider.width = _this.offsetWidth;

		//have to do this in `px` because of webkit's rounding errors :-(
		slideBlock.style.width = slider.width*slidesNumber+'px';
		for (var i = 0; i < slidesNumber; i++) {
			slider.slides[i].style.width = slider.width+'px';
		}
		changePos(-activeSlide*slider.width);
	}

	function addEvent(el, event, func) {
		if (!event) return;

		if (el.addEventListener) {
			el.addEventListener(event, func, false);
		}
		else {
			el.attachEvent('on'+event, func);
		}
	}

	function removeEvent(el, event, func) {
		if (el.removeEventListener) {
			el.removeEventListener(event, func, false);
		}
		else {
			el.detachEvent('on'+event, func);
		}
	}

	function setup() {
		//If the UA doesn't support css transforms or transitions -- use fallback functions.
		//Separate functions for better performance.
		if (!support.transforms) setPos = setPosFallback;
		if (!support.transitions) changePos = changePosFallback;

		slideBlock = document.createElement('div');
		slideBlock.className = 'slides';

		//get slides & generate dots
		for (var i = 0, l = _this.children.length; i < l; i++) {
			var slide = _this.children[i],
				dot = document.createElement('li'),
				links = slide.getElementsByTagName('a');

			slider.slides.push(slide);

			//`tabindex` makes dots tabbable
			dot.setAttribute('tabindex', '0');
			dot.setAttribute('role', 'button');

			dot.innerHTML = '<span></span>';

			//bind events to dots
			addEvent(dot, 'click', (function(x, b) {
				return function() {
					//Don't want to disable outlines completely for accessibility reasons,
					//so I just defocus the dot on click & set `outline: none` for `:active` in css.
					b.blur();
					changeActiveSlide(x);
					o.stopSlideshowAfterInteraction && stopSlideshow();
				};
			})(i, dot), false);

			//Bind the same function to Enter key, except for the `blur` part -- I dont't want
			//the focus to be lost when the user is using his keyboard to navigate.
			addEvent(dot, 'keyup', (function(x) {
				return function(event) {
					if (event.keyCode == 13) {
						changeActiveSlide(x);
						o.stopSlideshowAfterInteraction && stopSlideshow();
					}
				};
			})(i), false);

			//This solves tabbing problems:
			//Cycles through the links found in the slide and switches to that slide
			//when the link is focused. Also resets `scrollLeft` of the slider block.
			//`SetTimeout` solves Chrome's bug.
			for (var j = links.length - 1; j >= 0; j--) {
				addEvent(links[j], 'focus', function(x) {
					return function() {
						_this.scrollLeft = 0;
						setTimeout(function() {
							_this.scrollLeft = 0;
						}, 0);
						changeActiveSlide(x);
					}
				}(i), false);
			};

			slider.dots.push(dot);
		}

		slidesNumber = slider.slides.length;

		slideWidth = 100/slidesNumber;

		addClass(_this, classes.active);
		o.mouseDrag && addClass(_this, classes.mouse);
		
		slider.width = _this.offsetWidth;

		//have to do this in `px` because of webkit's rounding errors :-(
		slideBlock.style.width = slider.width*slidesNumber+'px';
		for (var i = 0; i < slidesNumber; i++) {
			slider.slides[i].style.width = slider.width+'px';
			slideBlock.appendChild(slider.slides[i]);
		}

		_this.appendChild(slideBlock);

		//append dots
		if (o.dots) {
			dotBlock = document.createElement('ul');
			dotBlock.className = 'dots';

			for (var i = 0, l = slider.dots.length; i < l; i++) {
				dotBlock.appendChild(slider.dots[i]);
			}

			if (o.dotsFirst) {
				_this.insertBefore(dotBlock,_this.firstChild);
			}
			else {
				_this.appendChild(dotBlock);
			}
		}

		//watch for slider width changes
		addEvent(window, 'resize', onWidthChange, false);
		addEvent(window, 'orientationchange', onWidthChange, false);

		//init first slide
		changeActiveSlide(o.startSlide, 0);

		//init slideshow
		if (o.slideshow) startSlideshow();

		//API callback
		o.onSetup && o.onSetup(slidesNumber);
	}

	//Init. Timeout to expose the API first.
	setTimeout(function() {
		setup();
		touchInit();
	}, 0);

	//expose the API
	return {
		slideTo: function(slide) {
			return changeActiveSlide(parseInt(slide, 10));
		},

		next: function() {
			return nextSlide();
		},

		prev: function() {
			return prevSlide();
		},

		//start slideshow
		start: function() {
			startSlideshow();
		},

		//stop slideshow
		stop: function() {
			stopSlideshow();
		},

		//pause slideshow until the next slide change
		pause: function() {
			pauseSlideshow();
		},

		//get current slide number
		getCurrentPos: function() {
			return activeSlide;
		},

		//get total number of slides
		getSlidesNumber: function() {
			return slidesNumber;
		},

		//invoke this when the slider's width is changed
		recalcWidth: function() {
			onWidthChange();
		}
	};
};

//if jQuery is present -- create a plugin
if (window.jQuery) {
	(function($) {
		$.fn.Peppermint = function(options) {
			this.each(function() {
				$(this).data('Peppermint', Peppermint($(this)[0], options));
			});
		};
	})(window.jQuery);
}