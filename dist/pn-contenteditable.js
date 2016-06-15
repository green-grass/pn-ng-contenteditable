(function () {

    'use strict';

    var DEFAULT_EVENT_NAMESPACE = '.contenteditable';

    var module = angular.module('pnContenteditable', []);

    module.directive('contenteditable', ['$sce', function ($sce) {
        var link = function (scope, element, attrs, ngModel) {
            var preserve = angular.isDefined(attrs.preserve),
                stripBr = angular.isDefined(attrs.stripBr),
                uncensored = angular.isDefined(attrs.uncensored),
                singleLine = angular.isDefined(attrs.singleLine),
                noHtml = angular.isDefined(attrs.noHtml);

            element.on('change', function () {
                console.log('c');
            });
            if (uncensored) {
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
                                if (event.type === 'keyup') {
                                    $this.cleanhtml('filterTags', { tags: ['font', 'span', 'b', 'i', 'u', 'strong', 'em', 'br'] });
                                } else {
                                    $this.cleanhtml('filterTags', { tags: ['font', 'span', 'b', 'i', 'u', 'strong', 'em'] });
                                }
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
            }

            if (!ngModel) return; // do nothing if no ng-model

            // Specify how UI should be updated
            ngModel.$render = function () {
                element.html($sce.getTrustedHtml(ngModel.$viewValue || ''));
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
                if (stripBr && html == '<br>') {
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

})();
