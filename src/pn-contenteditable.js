(function () {

    'use strict';

    var DEFAULT_EVENT_NAMESPACE = '.contenteditable';

    var TOOLBAR_TEMPLATE = '\
<div>\
    <button type="button" class="btn btn-xs btn-link" data-command="justifyleft"><span class="fa fa-align-left"></span></button>\
    <button type="button" class="btn btn-xs btn-link" data-command="justifycenter"><span class="fa fa-align-center"></span></button>\
    <button type="button" class="btn btn-xs btn-link" data-command="justifyright"><span class="fa fa-align-right"></span></button>\
    <button type="button" class="btn btn-xs btn-link" data-command="justifyfull"><span class="fa fa-align-justify"></span></button>\
    <button type="button" class="btn btn-xs btn-link" data-command="bold"><span class="fa fa-bold"></span></button>\
    <button type="button" class="btn btn-xs btn-link" data-command="italic"><span class="fa fa-italic"></span></button>\
    <button type="button" class="btn btn-xs btn-link" data-command="underline"><span class="fa fa-underline"></span></button>\
    <button type="button" class="btn btn-xs btn-link" data-command="createlink"><span class="fa fa-link"></span></button>\
    <button type="button" class="btn btn-xs btn-link" data-command="unlink"><span class="fa fa-unlink"></span></button>\
    <button type="button" class="btn btn-xs btn-link" data-command="insertImage"><span class="fa fa-photo"></span></button>\
    <button type="button" class="btn btn-xs btn-link" data-command="youtube" data-custom="true"><span class="fa fa-youtube"></span></button>\
    <button type="button" class="btn btn-xs btn-link" data-command="removeformat"><span class="fa fa-eraser"></span></button>\
</div>\
';

    var YOUTUBE_TEMPLATE = '\
<div class="video-wrapper">\
    <div class="video-container">\
        <iframe width=640" height="480" src="https://www.youtube.com/embed/{src}" frameborder="0" allowfullscreen></iframe>\
    </div>\
</div>';

    var module = angular.module('pnContenteditable', []);

    module.directive('contenteditable', ['$sce', function ($sce) {
        var link = function (scope, element, attrs, ngModel) {
            var preserve = angular.isDefined(attrs.preserve),
                ignoreBr = angular.isDefined(attrs.ignoreBr),
                uncensored = angular.isDefined(attrs.uncensored),
                singleLine = angular.isDefined(attrs.singleLine),
                noHtml = angular.isDefined(attrs.noHtml),
                hasToolbar = angular.isDefined(attrs.hasToolbar);

            // Disable image resize
            document.execCommand('enableObjectResizing', false, false);

            if (!uncensored) {
                element.on('paste' + DEFAULT_EVENT_NAMESPACE, function () {
                    var $this = $(this);
                    $this.cleanhtml('removeTags', { tags: ['script', 'iframe'] });
                });
            }

            if (singleLine) {
                element
                    .on('keydown' + DEFAULT_EVENT_NAMESPACE, function (event) {
                        if (event.keyCode === 13) {
                            event.preventDefault();
                        }
                    })

                    .on('keyup' + DEFAULT_EVENT_NAMESPACE +
                        ' paste' + DEFAULT_EVENT_NAMESPACE +
                        ' blur' + DEFAULT_EVENT_NAMESPACE,
                        function (event) {
                            var $this = $(this);
                            window.setTimeout(function () {
                                var tags = ['font', 'span', 'b', 'i', 'u', 'strong', 'em'],
                                    content = $this.html();
                                if (!ignoreBr && content === '<br>') {
                                    tags.push('br');
                                }
                                $this.cleanhtml('filterTags', { tags: tags });
                                $this.change();
                            }, event.type === 'paste' ? 10 : 0);
                        });
            }

            if (noHtml) {
                element.on('keyup' + DEFAULT_EVENT_NAMESPACE +
                           ' paste' + DEFAULT_EVENT_NAMESPACE +
                           ' blur' + DEFAULT_EVENT_NAMESPACE,
                           function (event) {
                               var $this = $(this);
                               if ($this.find('.rangySelectionBoundary').is('*')) {
                                   return;
                               }
                               window.setTimeout(function () {
                                   $this.cleanhtml('filterTags', { tags: ['div', 'p', 'br'] });
                                   $this.cleanhtml('filterAttrs'); // remove all attributes
                                   $this.change();
                               }, event.type === 'paste' ? 10 : 0);
                           });
            } else if (hasToolbar) {
                var toolbar = $(TOOLBAR_TEMPLATE),
                    buttons = $('button', toolbar);

                element
                    .on('focus' + DEFAULT_EVENT_NAMESPACE, function () {
                        $.each(buttons, function (index, button) {
                            var $button = $(button),
                                command = $button.data('command'),
                                custom = $button.data('custom');

                            if (custom || (document.queryCommandSupported(command) && document.queryCommandEnabled(command))) {
                                $button.prop('disabled', false);
                            }
                        });
                    })

                    .on('blur' + DEFAULT_EVENT_NAMESPACE, function () {
                        buttons.prop('disabled', true);
                    })

                    .after(toolbar);

                buttons
                    .prop('disabled', true)

                    .on('mousedown' + DEFAULT_EVENT_NAMESPACE, function (event) {
                        event.preventDefault();
                    })

                    .on('click' + DEFAULT_EVENT_NAMESPACE, function (event) {
                        event.preventDefault();

                        if (!$(element).is(':focus')) {
                            return;
                        }
                        
                        var $this = $(this),
                            command = $this.data('command');

                        switch (command) {
                            case 'createlink':
                                var url = window.prompt('URL:', 'http://');
                                if (url) {
                                    document.execCommand(command, false, url);
                                    if (url && (url.indexOf('http://') === 0 || url.indexOf('https://') === 0)) {
                                        $('a[href="' + url + '"]', element).attr('target', '_blank');
                                    }
                                }
                                break;

                            case 'insertImage':
                                var src = window.prompt('URL:', 'http://');
                                if (src) {
                                    document.execCommand(command, false, src);
                                    $('img', element).addClass('img-responsive');
                                }
                                break;

                            case 'youtube':
                                var src = window.prompt('YouTube URL:', 'http://');
                                if (src) {
                                    src = src.substr(src.lastIndexOf('=') + 1);
                                    src = src.substr(src.lastIndexOf('/') + 1);
                                    var html = YOUTUBE_TEMPLATE.replace('{src}', src);
                                    pasteHtmlAtCaret(html, false);
                                }
                                break;

                            default:
                                document.execCommand(command, false, null);
                        }
                    });
            }

            if (!ngModel) return; // do nothing if no ng-model

            // Specify how UI should be updated
            ngModel.$render = function () {
                element.html(uncensored ? (ngModel.$viewValue || '') : $sce.getTrustedHtml(ngModel.$viewValue || ''));
            };
            if (!preserve) {
                ngModel.$render(); // initialize
            }

            // Listen for change events to enable binding
            element.on('blur' + DEFAULT_EVENT_NAMESPACE +
                       ' keyup' + DEFAULT_EVENT_NAMESPACE +
                       ' change' + DEFAULT_EVENT_NAMESPACE,
                       function () {
                           scope.$evalAsync(read);
                       });
            if (preserve) {
                read(); // initialize
            }

            // Write data to the model
            function read() {
                var html = element.html();
                // When we clear the content editable the browser leaves a <br> behind
                // If strip-br attribute is provided then we strip this out
                if (!ignoreBr && html === '<br>') {
                    html = '';
                }
                ngModel.$setViewValue(html);
            }
        };

        return {
            restrict: 'A',
            require: '?ngModel',
            link: link
        };
    }]);

    // http://stackoverflow.com/questions/6690752/insert-html-at-caret-in-a-contenteditable-div/6691294#6691294
    function pasteHtmlAtCaret(html, selectPastedContent) {
        var sel, range;
        if (window.getSelection) {
            // IE9 and non-IE
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();

                // Range.createContextualFragment() would be useful here but is
                // only relatively recently standardized and is not supported in
                // some browsers (IE9, for one)
                var el = document.createElement("div");
                el.innerHTML = html;
                var frag = document.createDocumentFragment(), node, lastNode;
                while ((node = el.firstChild)) {
                    lastNode = frag.appendChild(node);
                }
                var firstNode = frag.firstChild;
                range.insertNode(frag);

                // Preserve the selection
                if (lastNode) {
                    range = range.cloneRange();
                    range.setStartAfter(lastNode);
                    if (selectPastedContent) {
                        range.setStartBefore(firstNode);
                    } else {
                        range.collapse(true);
                    }
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        } else if ((sel = document.selection) && sel.type != "Control") {
            // IE < 9
            var originalRange = sel.createRange();
            originalRange.collapse(true);
            sel.createRange().pasteHTML(html);
            if (selectPastedContent) {
                range = sel.createRange();
                range.setEndPoint("StartToStart", originalRange);
                range.select();
            }
        }
    }

})();
