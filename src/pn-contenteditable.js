(function () {

    'use strict';

    var DEFAULT_EVENT_NAMESPACE = '.contenteditable';

    var TOOLBAR_TEMPLATE = '\
<div>\
    <div class="buttons">\
        <button type="button" data-command="justifyleft">Align Left</button>\
        <button type="button" data-command="justifycenter">Align Center</button>\
        <button type="button" data-command="justifyright">Align Right</button>\
        <button type="button" data-command="justifyfull">Align Justify</button>\
        <button type="button" data-command="bold">Bold</button>\
        <button type="button" data-command="italic">Italic</button>\
        <button type="button" data-command="underline">Underline</button>\
        <button type="button" data-command="createlink">Create Link</button>\
        <button type="button" data-command="unlink">Unlink</button>\
        <button type="button" data-command="insertImage">Insert Image</button>\
        <button type="button" data-command="youtube" data-custom="true">Insert YouTube</button>\
        <button type="button" data-command="removeformat">Remove Format</button>\
        <button type="button" class="raw-editor-toggler">Show HTML</button>\
    </div>\
    <div class="raw-editor">\
        &lt;HTML&gt;\
        <textarea></textarea>\
    </div>\
</div>\
';

    var IMAGE_TEMPLATE = '<img src="{src}" />';

    var YOUTUBE_TEMPLATE = '<iframe width=640" height="480" src="https://www.youtube.com/embed/{src}" frameborder="0" allowfullscreen></iframe>';

    var module = angular.module('pnContenteditable', []);

    module.directive('contenteditable', ['$sce', function ($sce) {
        var link = function (scope, element, attrs, ngModel) {
            var preserve = angular.isDefined(attrs.preserve),
                ignoreBr = angular.isDefined(attrs.ignoreBr),
                uncensored = angular.isDefined(attrs.uncensored),
                singleLine = angular.isDefined(attrs.singleLine),
                noHtml = angular.isDefined(attrs.noHtml),
                hasToolbar = angular.isDefined(attrs.hasToolbar),
                rawEditor, rawEditorInput;

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
                var toolbar = $((scope.toolbarTemplate() || TOOLBAR_TEMPLATE)),
                    buttons = $('.buttons button[data-command]', toolbar),
                    rawEditorToggler = $('.buttons .raw-editor-toggler', toolbar);

                rawEditor = $('.raw-editor', toolbar).hide();
                rawEditorInput = $('textarea', rawEditor);

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
                                    var html = (scope.imageTemplate() || IMAGE_TEMPLATE).replace('{src}', src);
                                    PN.pasteHtmlAtCaret(html, false);
                                }
                                break;

                            case 'youtube':
                                var src = window.prompt('YouTube URL:', 'http://');
                                if (src) {
                                    src = src.substr(src.lastIndexOf('=') + 1);
                                    src = src.substr(src.lastIndexOf('/') + 1);
                                    var html = (scope.youtubeTemplate() || YOUTUBE_TEMPLATE).replace('{src}', src);
                                    PN.pasteHtmlAtCaret(html, false);
                                }
                                break;

                            default:
                                document.execCommand(command, false, null);
                        }
                    });

                rawEditorToggler.on('click' + DEFAULT_EVENT_NAMESPACE, function (event) {
                    event.preventDefault();
                    rawEditor.animate({
                        opacity: 'toggle',
                        height: 'toggle'
                    }, 'fast');
                });

                rawEditorInput.on('blur' + DEFAULT_EVENT_NAMESPACE, function () {
                    var html = $(this).val();
                    if (html !== ngModel.$viewValue) {
                        ngModel.$setViewValue(html);
                        ngModel.$render();
                    }
                });
            }

            if (!ngModel) return; // do nothing if no ng-model

            // Specify how UI should be updated
            ngModel.$render = function () {
                var html = uncensored ? (ngModel.$viewValue || '') : $sce.getTrustedHtml(ngModel.$viewValue || '');
                element.html(html);
                if (rawEditorInput) {
                    rawEditorInput.val(html);
                }
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
                rawEditorInput.val(html);
            }
        };

        return {
            restrict: 'A',
            require: '?ngModel',
            scope: {
                toolbarTemplate: '&',
                imageTemplate: '&',
                youtubeTemplate: '&'
            },
            link: link
        };
    }]);

})();
