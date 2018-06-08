define([
    'core/js/adapt',
    './completionCalculations',
    './PageLevelProgressMenuView',
    './PageLevelProgressNavigationView',
    './PageLevelProgressIndicatorView'
], function(Adapt, completionCalculations, PageLevelProgressMenuView, PageLevelProgressNavigationView, PageLevelProgressIndicatorView) {

    function setupPageLevelProgress(pageModel, enabledProgressComponents) {
        new PageLevelProgressNavigationView({model: pageModel, collection: new Backbone.Collection(enabledProgressComponents)});
    }

    var types = [ 'page', 'article', 'block', 'component' ];
    var eventNames = types.concat(['']).join('View:postRender ');
    Adapt.on(eventNames, function(view) {
        var model = view.model;
        if (!model.get('_isCompletionIndicatorEnabled')) return;
        var $headings = view.$('.js-heading');
        $headings.each(function(index, el) {
            new PageLevelProgressIndicatorView({
                el: el,
                model: model
            });
        });
    });


    // This should add/update progress on menuView
    Adapt.on('menuView:postRender', function(view) {
        if (view.model.get('_id') == Adapt.location._currentId) return;

        var coursePLPConfig = Adapt.course.get('_pageLevelProgress');

        // do not proceed if pageLevelProgress is not enabled in course.json
        if (!coursePLPConfig || !coursePLPConfig._isEnabled) {
            return;
        }

        var pageLevelProgress = view.model.get('_pageLevelProgress');
        var viewType = view.model.get('_type');

        // Progress bar should not render for course viewType
        if (viewType == 'course') return;

        if (pageLevelProgress && pageLevelProgress._isEnabled) {
            var completionObject = completionCalculations.calculateCompletion(view.model);

            //take all non-assessment components and subprogress info into the percentage
            //this allows the user to see if the assessments are passed (subprogress) and all other components are complete

            var completed = completionObject.nonAssessmentCompleted + completionObject.subProgressCompleted;
            var total = completionObject.nonAssessmentTotal + completionObject.subProgressTotal;

            var percentageComplete = Math.floor((completed / total) * 100);

            view.model.set('completedChildrenAsPercentage', percentageComplete);
            view.$el.find('.menu-item-inner').append(new PageLevelProgressMenuView({model: view.model}).$el);
        }
    });

    // This should add/update progress on page navigation bar
    Adapt.on('router:page', function(pageModel) {
        var coursePLPConfig = Adapt.course.get('_pageLevelProgress');
        var pagePLPConfig = pageModel.get('_pageLevelProgress');

        // do not proceed if pageLevelProgress is not enabled in course.json or for the content object
        if (!coursePLPConfig || !coursePLPConfig._isEnabled || !pagePLPConfig || !pagePLPConfig._isEnabled) {
            return;
        }

        var currentPageComponents = _.filter(pageModel.findDescendantModels('components'), function(comp) {
            return comp.get('_isAvailable') === true;
        });
        var availableComponents = completionCalculations.filterAvailableChildren(currentPageComponents);
        var enabledProgressComponents = completionCalculations.getPageLevelProgressEnabledModels(availableComponents);

        if (enabledProgressComponents.length > 0) {
            setupPageLevelProgress(pageModel, enabledProgressComponents);
        }
    });

});
