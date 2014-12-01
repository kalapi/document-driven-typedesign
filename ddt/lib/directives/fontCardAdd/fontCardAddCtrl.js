'use strict';

var _ = require('lodash');


module.exports = function ($scope, $q, $http, FontFamily, FontFamilySources, fontFamilyCollection) {
    var init = function() {
        $scope.fontFamily = {
            name: fontFamilyCollection.generatePlaceholderName()
        };
        $scope.urlFields = [{name: 'url1'}];
        $scope.currentView = 'main';
    };

    $scope.addFontFamily = function(fontFiles) {
        if (_.size(fontFiles) === 0) {
            return;
        }

        var family = new FontFamily($scope.fontFamily.name);
        var addPromise = $q.all(_.map(fontFiles, function(file) {
            return family.addFontFromFile(file);
        }));

        addPromise.then(function() {
            fontFamilyCollection.add(family);
            init();
        }, function() {
            // TODO: pop up an error.
        });
    };

    $scope.addUrlField = function() {
        $scope.urlFields.push({name: 'url' + ($scope.urlFields.length + 1).toString()});
    };

    $scope.createFamilyFromUrls = function() {
        if (!$scope.urlUploadForm.$valid) {
            // TODO: display an error dialog.
            return;
        }

        var family = new FontFamily(
            fontFamilyCollection.generatePlaceholderName(),
            FontFamilySources.URL);

        var promises = _.map($scope.urlFields, function(urlField) {
            return family.addFontFromUrl(urlField.url);
        });

        $q.all(promises)
            .then(function() {
                fontFamilyCollection.add(family);
                init();
            }, function() {
                // TODO: pop up an error.
            });
    };

    init();
};
