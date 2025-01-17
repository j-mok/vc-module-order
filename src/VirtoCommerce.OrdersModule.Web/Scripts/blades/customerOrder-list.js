angular.module('virtoCommerce.orderModule')
    .controller('virtoCommerce.orderModule.customerOrderListController', ['$rootScope','$scope', '$localStorage', 'virtoCommerce.orderModule.order_res_customerOrders', 'platformWebApp.bladeUtils', 'platformWebApp.dialogService', 'platformWebApp.authService', 'uiGridConstants', 'platformWebApp.uiGridHelper', 'platformWebApp.ui-grid.extension', 'virtoCommerce.orderModule.knownOperations', '$translate', 
function ($rootScope, $scope, $localStorage, customerOrders, bladeUtils, dialogService, authService, uiGridConstants, uiGridHelper, gridOptionExtension, knownOperations, $translate) {
    var blade = $scope.blade;
    var bladeNavigationService = bladeUtils.bladeNavigationService;
    $scope.uiGridConstants = uiGridConstants;
    $scope.useIndexedSearch = false;
    
    $scope.getPricesVisibility = () => authService.checkPermission('order:read_prices');

    $scope.getGridOptions = () => {
        return {
        useExternalSorting: true,
        data: 'objects',
        rowTemplate: 'order-list.row.html',
        columnDefs: [
                   { name: 'actions', displayName: '', enableColumnResizing: false, enableSorting: false, width: 30, cellTemplate: 'list-actions.cell.html', pinnedLeft: true, displayAlways: true },
                   { name: 'number', displayName: 'orders.blades.customerOrder-list.labels.number', width: '***', displayAlways: true },
                   { name: 'customerName', displayName: 'orders.blades.customerOrder-list.labels.customer', width: '***' },
                   { name: 'storeId', displayName: 'orders.blades.customerOrder-list.labels.store', width: '**' },
                   { name: 'total', displayName: 'orders.blades.customerOrder-list.labels.total', cellFilter: 'currency | showPrice:' + $scope.getPricesVisibility(), width: '**' },
                   { name: 'currency', displayName: 'orders.blades.customerOrder-list.labels.currency', width: '*' },
                   { name: 'isApproved', displayName: 'orders.blades.customerOrder-list.labels.confirmed', width: '*', cellClass: '__blue' },
                   { name: 'status', displayName: 'orders.blades.customerOrder-list.labels.status', cellFilter: 'settingTranslate:"Order.Status"', width: '*' },
                   { name: 'createdDate', displayName: 'orders.blades.customerOrder-list.labels.created', width: '**', sort: { direction: uiGridConstants.DESC } }
       ]}
    }

    $rootScope.$on('loginStatusChanged', (securityScopes) => {
        $translate.refresh().then(() => {
            let gridOptions = $scope.getGridOptions();
            $scope.setGridOptions("customerOrder-list-grid", gridOptions);
        });
    });

    blade.refresh = function () {
        var criteria = {
            responseGroup: "WithPrices",
            keyword: filter.keyword,
            sort: uiGridHelper.getSortExpression($scope),
            skip: ($scope.pageSettings.currentPage - 1) * $scope.pageSettings.itemsPerPageCount,
            take: $scope.pageSettings.itemsPerPageCount
        };

        if (angular.isFunction(blade.refreshCallback)) {
            blade.isLoading = true;

            var result = blade.refreshCallback(blade, criteria);

            if (angular.isDefined(result.$promise)) {
                result.$promise.then(function (data) {
                    blade.isLoading = false;

                    $scope.pageSettings.totalItems = data.totalCount;
                    $scope.objects = data.results;
                });
            }
        }
        else if (blade.preloadedOrders) {
            $scope.pageSettings.totalItems = blade.preloadedOrders.length;
            $scope.objects = blade.preloadedOrders;

            blade.isLoading = false;
        } else {
            blade.isLoading = true;

            if (blade.searchCriteria) {
                angular.extend(criteria, blade.searchCriteria);
            }

            if (filter.current) {
                angular.extend(criteria, filter.current);
            }

            var endpoint = customerOrders.search;

            if ($scope.useIndexedSearch && (criteria.keyword || filter.current)) {
                endpoint = customerOrders.indexedSearch;
            }

            endpoint(criteria, function (data) {
                blade.isLoading = false;

                $scope.pageSettings.totalItems = data.totalCount;
                $scope.objects = data.results;
            });
        }
    };

    $scope.selectNode = function (node) {
        $scope.selectedNodeId = node.id;

        var foundTemplate = knownOperations.getOperation(node.operationType);
        if (foundTemplate) {
            var newBlade = angular.copy(foundTemplate.detailBlade);
            if (blade.preloadedOrders || angular.isFunction(blade.refreshCallback)) {
                newBlade.id = 'preloadedOrderDetails';
            }
            newBlade.customerOrder = node;
            bladeNavigationService.showBlade(newBlade, blade);
        }
    };

    $scope.deleteList = function (list) {
        var dialog = {
            id: "confirmDeleteItem",
            title: "orders.dialogs.orders-delete.title",
            message: "orders.dialogs.orders-delete.message",
            callback: function (remove) {
                if (remove) {
                    $scope.isLoading = true;
                    closeChildrenBlades();

                    var itemIds = _.pluck(list, 'id');
                    customerOrders.remove({ ids: itemIds }, function (data, headers) {
                        blade.refresh();
                    },
                    function (error) {
                        bladeNavigationService.setError('Error ' + error.status, blade);
                    });
                 
                }
            }
        };
        dialogService.showConfirmationDialog(dialog);
    };

    function closeChildrenBlades() {
        angular.forEach(blade.childrenBlades.slice(), function (child) {
            bladeNavigationService.closeBlade(child);
        });
    }

    blade.headIcon = 'fa fa-file-text';

    blade.toolbarCommands = [
            {
                name: "platform.commands.refresh", icon: 'fa fa-refresh',
                executeMethod: blade.refresh,
                canExecuteMethod: function () {
                    return true;
                }
            }
    ];
    if (!blade.hideDelete) {
        blade.toolbarCommands.push({
            name: "platform.commands.delete", icon: 'fas fa-trash-alt',
            executeMethod: function () {
                $scope.deleteList($scope.gridApi.selection.getSelectedRows());
            },
            canExecuteMethod: function () {
                return $scope.gridApi && _.any($scope.gridApi.selection.getSelectedRows());
            },
            permission: 'order:delete'
        });
    }

    // simple and advanced filtering
    var filter = blade.filter = $scope.filter = {};
    $scope.$localStorage = $localStorage;
    if (!$localStorage.orderSearchFilters) {
        $localStorage.orderSearchFilters = [{ name: 'orders.blades.customerOrder-list.labels.new-filter' }];
    }
    if ($localStorage.orderSearchFilterId) {
        filter.current = _.findWhere($localStorage.orderSearchFilters, { id: $localStorage.orderSearchFilterId });
    }

    filter.change = function () {
        $localStorage.orderSearchFilterId = filter.current ? filter.current.id : null;
        if (filter.current && !filter.current.id) {
            filter.current = null;
            showFilterDetailBlade({ isNew: true });
        } else {
            bladeNavigationService.closeBlade({ id: 'filterDetail' });
            filter.criteriaChanged();
        }
    };

    filter.edit = function () {
        if (filter.current) {
            showFilterDetailBlade({ data: filter.current });
        }
    };

    function showFilterDetailBlade(bladeData) {
        var newBlade = {
            id: 'filterDetail',
            controller: 'virtoCommerce.orderModule.filterDetailController',
            template: 'Modules/$(VirtoCommerce.Orders)/Scripts/blades/filter-detail.tpl.html'
        };
        angular.extend(newBlade, bladeData);
        bladeNavigationService.showBlade(newBlade, blade);
    }

    filter.criteriaChanged = function () {
        if ($scope.pageSettings.currentPage > 1) {
            $scope.pageSettings.currentPage = 1;
        } else {
            blade.refresh();
        }
    };

    blade.onExpand = function () {
        $scope.gridOptions.onExpand();
    };
    blade.onCollapse = function () {
        $scope.gridOptions.onCollapse();
    };

    // ui-grid
    $scope.setGridOptions = function (gridId, gridOptions) {
        // add currency filter for properties that need it
        Array.prototype.push.apply(gridOptions.columnDefs, _.map([
            "discountAmount", "subTotal", "subTotalWithTax", "subTotalDiscount", "subTotalDiscountWithTax", "subTotalTaxTotal",
            "shippingTotal", "shippingTotalWithTax", "shippingSubTotal", "shippingSubTotalWithTax", "shippingDiscountTotal", "shippingDiscountTotalWithTax", "shippingTaxTotal",
            "paymentTotal", "paymentTotalWithTax", "paymentSubTotal", "paymentSubTotalWithTax", "paymentDiscountTotal", "paymentDiscountTotalWithTax", "paymentTaxTotal",
            "discountTotal", "discountTotalWithTax", "fee", "feeWithTax", "feeTotal", "feeTotalWithTax", "taxTotal", "sum"
        ], function(name) {
            return { name: name, cellFilter: "currency | showPrice:" + $scope.getPricesVisibility(), visible: false };
        }));

        $scope.gridOptions = gridOptions;
        gridOptionExtension.tryExtendGridOptions(gridId, gridOptions);

        uiGridHelper.initialize($scope, gridOptions, function (gridApi) {
            if (blade.preloadedOrders) {
                $scope.gridOptions.enableSorting = true;
                $scope.gridOptions.useExternalSorting = false;              
            }
            else {
                uiGridHelper.bindRefreshOnSortChanged($scope);
            }
        });

        bladeUtils.initializePagination($scope);

        return gridOptions;
    };

    customerOrders.indexedSearchEnabled(function (data) {
        $scope.useIndexedSearch = data.result;
    });


    // actions on load
    //No need to call this because page 'pageSettings.currentPage' is watched!!! It would trigger subsequent duplicated req...
    //blade.refresh();
}]);
