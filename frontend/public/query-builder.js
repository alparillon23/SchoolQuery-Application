/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */

coursesColumns = ["audit", "avg", "dept", "fail", "id", "instructor", "pass", "title", "uuid", "year"];
roomsColumns = ["address", "fullname", "furniture", "href", "lat", "lon", "name", "number", "seats", "shortname", "type"];

CampusExplorer.buildQuery = function () {
    let query = {};
    let dataSetKind = document.getElementsByClassName("tab-panel active")[0].id.split("-")[1];
    query["WHERE"] = buildWhere(dataSetKind);
    let order = buildOrder(dataSetKind);
    let columns = buildColumns(dataSetKind);
    if (order.keys.length > 0) {
        query["OPTIONS"] = {COLUMNS: columns, ORDER: order};
    } else {
        query["OPTIONS"] = {COLUMNS: columns};
    }
    let groups = buildGroup(dataSetKind);
    if (groups.length > 0) {
        query["TRANSFORMATIONS"] = {GROUP: groups, APPLY: buildApply(dataSetKind)};
    }
    return query;
};

function buildApply(dataSetKind) {
    let applyArray = [];
    let tabDatasetKind = document.getElementById("tab-" + dataSetKind);
    let applyContainer = tabDatasetKind.getElementsByClassName("transformations-container")[0];
    let applyElements = applyContainer.getElementsByClassName("control-group transformation");
    for (let apply of applyElements) {
        let term = apply.getElementsByClassName("control term")[0].getElementsByTagName("input")[0].value;
        let operator = apply.getElementsByClassName("control operators")[0].getElementsByTagName("select")[0].value;
        let field = apply.getElementsByClassName("control fields")[0].getElementsByTagName("select")[0].value;
        let applyJson = {[term]: {[operator]: dataSetKind + "_" + field}};
        applyArray.push(applyJson);
    }
    return applyArray;
}

function buildGroup(dataSetKind) {
    let groups = [];
    let groupIds = [];
    if (dataSetKind === "courses") {
        groupIds = coursesColumns;
    } else {
        groupIds = roomsColumns;
    }
    groupIds.forEach((colId) => {
        let currElement = document.getElementById(dataSetKind + "-groups-field-" + colId);
        if (currElement.checked === true) {
            groups.push(dataSetKind + "_" + currElement.value)
        }
    });
    return groups;
}

function buildOrder(dataSetKind) {
    let keys = [];
    let orderDataset = [];
    if (dataSetKind === "courses") {
        orderDataset = coursesColumns;
    } else {
        orderDataset = roomsColumns;
    }
    let tabDatasetKind = document.getElementById("tab-" + dataSetKind);
    let orderDiv = tabDatasetKind.getElementsByClassName("form-group order")[0];
    let selectTagOptions = orderDiv.getElementsByTagName("select")[0].selectedOptions;
    for (let option of selectTagOptions) {
        if (orderDataset.includes(option.value)) {
            keys.push(dataSetKind + "_" + option.value)
        } else {
            keys.push(option.value)
        }
    }
    let isDescending = document.getElementById(dataSetKind+ "-order").checked;
    let order = {keys: keys};
    if (isDescending === true) {
        order["dir"] = "DOWN";
    } else {
        order["dir"] = "UP";
    }
    return order;
}

function buildColumns(dataSetKind) {
    let columns = [];
    let columnsDataset = [];
    if (dataSetKind === "courses") {
        columnsDataset = coursesColumns;
    } else {
        columnsDataset = roomsColumns;
    }
    let tabDatasetKind = document.getElementById("tab-" + dataSetKind);
    let columnsDiv = tabDatasetKind.getElementsByClassName("form-group columns")[0];
    let columnInputs = columnsDiv.getElementsByTagName("input");
    for (let input of columnInputs) {
        if (input.checked === true) {
            if (columnsDataset.includes(input.value)) {
                columns.push(dataSetKind + "_" + input.value)
            } else {
                columns.push(input.value)
            }
        }
    }
    return columns;
}

function buildWhere(dataSetKind) {
    let where = {};
    let tabDatasetKind = document.getElementById("tab-" + dataSetKind);
    let conditionRadios = {
        AND: dataSetKind + "-conditiontype-all",
        OR: dataSetKind + "-conditiontype-any", NONE: dataSetKind + "-conditiontype-none"
    };
    let condition = "";

    for (let cond of Object.keys(conditionRadios)) {
        let condElement = document.getElementById(conditionRadios[cond]);
        if (condElement.checked === true) {
            condition = cond;
        }
    }
    let conditionsContainer = tabDatasetKind.getElementsByClassName("conditions-container")[0];
    let conditions = conditionsContainer.getElementsByClassName("control-group condition");
    if (condition === "NONE" || conditions.length === 0) {
        where = {}
    } else {
        let conditionsArray = formatConditions(conditions, dataSetKind);
        if (conditions.length === 1) {
            where = conditionsArray[0];
        } else {
            where = {[condition]: conditionsArray}
        }
    }
    return where;
}

function formatConditions(conditions, datasetKind) {
    let condArray = [];
    for (let cond of conditions) {
        let not = cond.getElementsByClassName("control not")[0].getElementsByTagName("input")[0].checked;
        let field = cond.getElementsByClassName("control fields")[0].getElementsByTagName("select")[0].value;
        let operator = cond.getElementsByClassName("control operators")[0].getElementsByTagName("select")[0].value;
        let term = cond.getElementsByClassName("control term")[0].getElementsByTagName("input")[0].value;

        if (operator === "EQ" || operator === "GT" || operator === "LT") {
            if (!isNaN(parseInt(term, 10))) {
                term = parseInt(term, 10);
            }
        }

        let conditionJson = {};
        let conditionInner = {};
        conditionInner[datasetKind + "_" + field] = term;
        conditionJson[operator] = conditionInner;
        if (not === true) {
            conditionJson = {NOT: conditionJson};
        }
        condArray.push(conditionJson);
    }
    return condArray;
}


