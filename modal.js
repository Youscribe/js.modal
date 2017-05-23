(function (root, factory) {

    // Set up Modal appropriately for the environment. Start with AMD.
    if (typeof define === 'function' && define.amd) {
        define(['jquery', 'exports'], function ($, exports) {
            // Export global even in AMD case in case this script is loaded with
            // others that may still expect a global Modal.
            root.Modal = factory(root, exports, $);
        });
    } else {
        root.Modal = factory(root, {}, (root.jQuery || root.Zepto || root.ender || root.$));
    }
}(this, function (root, Modal, $) {

    /** destroy Method **/
    Modal.destroy = function () {
        $('.modal-modal, .modal').remove();
        $.currentModal = undefined;
    };

    /** load Method (Url) **/
    Modal.loadFromUrl = function (url, options) {
        this.destroy();

        options = $.extend(options || {}, {
            show: true,
            unload: true
        });
        var modal = new _Modal(options);
        modal.showLoading();
        modal.show();

        if (url.indexOf('#') === 0) {
            var $html = $(url);
            if ($html) {
                var $content = $html.clone().show();
                modal.setContent($content);
                if (options.onLoaded) {
                    options.onLoaded(modal.html);
                }
            }
        } else {

            var request = {
                url: url,
                dataType: options.dataType !== undefined ? options.dataType : 'html',
                data: options.data !== undefined ? options.data : '',
                type: options.type !== undefined ? options.type : 'GET',
                cache: false,
                error: function (request) {
                    console.log(request.responseText);
                    modal.hide();
                },
                success: function (html) {
                    modal.setContent(html);
                    if (options.onLoaded) {
                        options.onLoaded(modal.html);
                    }
                }
            };

            if (options.form) {
                var data = $(options.form).serializeArray();
                request.data = data;
                request.type = 'POST';
            }
            $.ajax(request);
        }
        $.currentModal = modal;
    };

    /** load Method (Content) **/
    Modal.loadFromContent = function (content, options) {
        this.destroy();

        options = jQuery.extend(options || {}, {
            show: true,
            unload: true
        });
        $.currentModal = new _Modal(options);
        $.currentModal.showLoading();
        $.currentModal.show();
        $.currentModal.setContent(content);
        if (options.onLoaded) {
            options.onLoaded($.currentModal.html);
        }
    };

    Modal.close = function () {
        this.destroy();
    };

    var _Modal = function (options) {
        var _this = this;
        var $document = $(document);
        var $window = $(root);

        _this.options = $.extend({}, _Modal.prototype.options, options || {});

        // init modal viewport
        _this.content = $(_this.template);

        // adjust title
        _this.content.on('click', '.modal-closebtn, .popup-close', function (e) {
            _this.hide();
            e.preventDefault();
        });

        // Set AutoHide after Click
        if (_this.$modal && _this.options.modalAutoHide) {
            _this.$modal.on('click', $.proxy(_this.hide, _this));
        }

        // Set AutoClose
        if (_this.options.autoclose !== null) {
            root.setTimeout($.proxy(_this.hide, _this), _this.options.autoclose);
        }

        // Bind keyDown.modal
        $document.on('keydown.modal', $.proxy(_this.keyHandler, _this));

    };

    // Attach all inheritable methods && attributes to the Modal prototype.
    $.extend(_Modal.prototype, {
        options: {
            autoclose: null, // autoclose message after 'x' miliseconds, i.e: 5000
            buttons: [], // array of buttons, i.e: [{id: 'ok', label: 'OK', val: 'OK'}]
            callback: null, // callback function after close message
            center: true, // center message on screen
            closeButton: true, // show close button in header title (or content if buttons array is empty).
            height: 'auto', // content height
            title: null, // message title
            titleClass: null, // title style: info, warning, success, error
            modal: false, // shows message in modal (loads background)
            modalOpacity: 0.2, // modal background opacity
            modalAutoHide: true, // auto hide the modal when click
            padding: '10px', // content padding
            show: true, // show message after load
            unload: true, // unload message after hide
            width: '500px', // message width
            zIndex: 10000, // message z-index
            windowMargin: 50, // when the content is more than the window size set the margin height
            loadJS: true,
            exitOnEscapte: true
        },
        template: '<div class="modal"><div class="modal-box"><div class="modal-wrapper"><div class="modal-content"></div></div></div></div>',
        loadingTemplate: '<div class="modal-loading"></div>',
        content: '',
        visible: false,
        html: '',

        /**
         * [filterScripts description]
         * @param  {[type]} data [description]
         * @return {[type]}      [description]
         */
        filterScripts: function (data) {
            var scriptsUrl = [];
            var scripts = [];
            var tmp = [];

            // Removing the body, head and html tag
            if (typeof data === 'string') {
                data = data.replace(/<\/?(html|head|body)([^>]*)>/gi, '');
            }

            $.each(
                $(data),
                function () {
                    if (!$.nodeName(this, "script"))
                        tmp.push(this);
                    else if ($(this).attr("src"))
                        scriptsUrl.push($(this).attr("src"));
                    else
                        scripts.push($(this).text());
                });

            return [tmp, scriptsUrl, scripts];
        },

        /**
         * [setContent description]
         * @param {[type]} data [description]
         */
        setContent: function (data) {
            var filterRes = this.filterScripts(data);
            this.html = filterRes[0];
            var $modalContent = $('.modal-content', this.content);
            $modalContent.css({
                padding: this.options.padding,
                height: this.options.height
            }).empty();

            if (this.options.closeButton) {
                $modalContent.append('<span class="modal-closebtn"></span>');
            }

            $modalContent.append(this.html);

            // execute js when html element are available
            if (this.options.loadJS) {
                var scriptUrls = filterRes[1];
                var s = document.getElementsByTagName('script')[0];

                var el = document.createElement('script');
                el.type = 'text/javascript';
                if (el.textContent !== undefined)
                    el.textContent = filterRes[2].join('\n');
                else
                    el.innerText = filterRes[2].join('\n');
                s.parentNode.insertBefore(el, s);

                for (var i = 0; i < scriptUrls.length; i++) {
                    el = document.createElement('script');
                    el.type = 'text/javascript';
                    el.src = scriptUrls[i];
                    s.parentNode.insertBefore(el, s);
                }
            }

            this.updatePosition();
        },

        /**
         * [showLoading description]
         * @return {[type]} [description]
         */
        showLoading: function () {
            $('.modal-content', this.content)
                .css({
                    padding: this.options.padding,
                    height: this.options.height
                })
                .empty()
                .append(this.loadingTemplate);
        },

        /**
         * [show description]
         */
        show: function () {

            if (this.visible) {
                return;
            }

            if (this.options.modal && this.$modal) this.$modal.show();
            this.content.appendTo(document.body);

            this.updatePosition();
        },

        /**
         * [updatePosition description]
         * @return {[type]} [description]
         */
        updatePosition: function () {
            if ($('.modal-content').innerWidth() === 0) {
                root.setTimeout($.proxy(this.updatePosition, this), 100);
            }

            this.content
                .css({
                    'z-index': this.options.zIndex + $('.modal').length
                })
                .show()
                .animate({
                    opacity: 1
                }, 300);

            this.visible = true;
        },

        /**
         * [hide description]
         * @param  {[type]} after [description]
         * @return {[type]}       [description]
         */
        hide: function (after) {

            if (!this.visible) return;

            var _animationCompleted = function () {
                if (this.$modal && this.options.modal) {
                    this.$modal.remove();
                }
                this.content.css({
                    display: 'none'
                }).remove();
                this.visible = false;

                if (this.options.unload) {
                    this.unload();
                }

                if (this.options.onHide) {
                    this.options.onHide();
                }

            };

            this.content.animate({
                opacity: 0
            }, 300, $.proxy(_animationCompleted, this));

            return this;
        },

        /**
         * [toggle description]
         * @return {[type]} [description]
         */
        toggle: function () {
            this[this.visible ? 'hide' : 'show']();
            return this;
        },

        /**
         * [unload description]
         * @return {[type]} [description]
         */
        unload: function () {
            if (this.visible)
                this.hide();
            var _this = this;
            this.content.remove();
            $.currentModal = undefined;
        },

        /**
         * [keyHandler description]
         * @param  {[type]} e [description]
         * @return {[type]}   [description]
         */
        keyHandler: function (e) {
            if (this.options.exitOnEscapte && e.keyCode === 27) {
                this.hide();
            }
        }
    });

    return Modal;
}));