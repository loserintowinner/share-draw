mxMermaidToDrawio = function(graph, diagramtype, extra)
{
    if (mxMermaidToDrawio.listeners.length == 0) return;

    var grayscaleColors = [
        ['#000', '#b4b4b4'],
        ['#fff', '#555'],
        ['#000', '#bbb'],
        ['#fff', '#777'],
        ['#000', '#999'],
        ['#000', '#ddd'],
        ['#000', '#fff'],
        ['#000', '#ddd']
    ];

    var IsStateDiagram = diagramtype == 'statediagram';
    var modelString = EditorUi.prototype.emptyDiagramXml;

    try
    {
        modelString = convertDiagram(graph);
    }
    catch (e)
    {
        console.log('mermaidToDrawio', e);
    }

    for (var i = 0; i < mxMermaidToDrawio.listeners.length; i++)
    {
        mxMermaidToDrawio.listeners[i](modelString);
        clearTimeout(mxMermaidToDrawio.timeouts[i]);
    }

    if (urlParams['mermaidToDrawioTest'] != '1')
    {
        mxMermaidToDrawio.resetListeners();
    }

    return;

    function createMxGraph()
    {
        var graph = new Graph();
        graph.setExtendParents(false);
        graph.setExtendParentsOnAdd(false);
        graph.setConstrainChildren(false);
        graph.setHtmlLabels(true);
        graph.getModel().maintainEdgeParent = false;
        return graph;
    };

    function formatLabel(label, type)
    {
        if (label == null) return '';

        if (Array.isArray(label))
        {
            var str = [];

            for (var i = 0; i < label.length; i++)
            {
                str.push(formatLabel(label[i]));
            }

            return str.join('\n');
        }

        if (typeof label == 'object')
        {
            label = (label.visibility || '') + label.id +
                (label.parameters != null? '(' + label.parameters + ')' : '') +
                (label.returnType? ' : ' + label.returnType : '');
            // TODO label.classifier ($ underline, * italic) but we don't use HTML labels so far
        }

        label = (label? label.replace(/\\n/g, '\n').replace(/<br\s*\/?>/gi, '\n') : '') +
            (type ? '<' + type + '>' : '');

        var m;

        while (label && (m = label.match(/~/g)) && m.length > 1)
        {
            label = label[0] + label.substring(1).replace(/~(.+)~/g, '<$1>');
        }

        return label;
    }

    function insertVertex(drawGraph, parent, id, value, x, y, width, height, style, relative)
    {
        return drawGraph.insertVertex(parent, id, value, Math.round(x), Math.round(y),
            Math.round(width), Math.round(height), style, relative);
    }

    function simpleShape(style, node, parent, drawGraph)
    {
        return insertVertex(drawGraph, parent , null, formatLabel(node.labelText),
            node.x, node.y, node.width, node.height, style);
    }

    function fixNodePos(node)
    {
        node.x -= node.width/2;
        node.y -= node.height/2;
    }

    // TODO Add styles if needed
    function addNode(node, parent, drawGraph, noPosFix)
    {
        var v;

        if (!noPosFix)
        {
            fixNodePos(node);
        }

        if (node.clusterNode)
        {
            node.shape = node.clusterData.shape;
            node.labelText = node.clusterData.labelText;
            node.type = node.clusterData.type;
        }

        switch (node.shape)
        {
            case 'class_box':
                var members = node.classData.members;
                var methods = node.classData.methods;
                var annotations = node.classData.annotations || [];
                var annotationsStr = '';

                for (var i = 0; i < annotations.length; i++)
                {
                    annotationsStr += '<<' + formatLabel(annotations[i]) + '>>\n';
                }

                var rowCount = 1 + (annotations.length / 2) + Math.max(members.length, 0.5) + Math.max(methods.length, 0.5);
                var rowHeight = (node.height - 8) / rowCount; // 8 is separator line height

                v = insertVertex(drawGraph, parent, null, annotationsStr + formatLabel(node.labelText, node.type), node.x, node.y, node.width, node.height, 'swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=' + (rowHeight * (1 + annotations.length / 2)) + ';horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=0;marginBottom=0;');
                var y = rowHeight + (members.length == 0? rowHeight / 2 : 0);

                for (var i = 0; i < members.length; i++)
                {
                    insertVertex(drawGraph, v, null, formatLabel(members[i]), 0, y, node.width, rowHeight, 'text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;');
                    y += rowHeight;
                }

                insertVertex(drawGraph, v, null, null, 0, y, node.width, methods.length == 0? rowHeight / 2 : 8, 'line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=3;rotatable=0;labelPosition=right;points=[];portConstraint=eastwest;strokeColor=inherit;');
                y += 8;

                for (var i = 0; i < methods.length; i++)
                {
                    insertVertex(drawGraph, v, null, formatLabel(methods[i]), 0, y, node.width, rowHeight, 'text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;');
                    y += rowHeight;
                }
                break;
            case 'note':
                v = simpleShape('align=left;spacingLeft=4;', node, parent, drawGraph);
                break;
            case 'rect':
            case 'square':
            case 'round':
            case 'group':
                v = simpleShape((node.type == 'round' || IsStateDiagram ? 'rounded=1;absoluteArcSize=1;arcSize=14;' : '') +
                    'whiteSpace=wrap;strokeWidth=2;' +
                    (node.type == 'group'? 'verticalAlign=top;' : ''), node, parent, drawGraph);
                break;
            case 'question':
            case 'choice':
            case 'diamond':
                if (node.shape == 'choice') node.labelText = '';
                v = simpleShape('rhombus;strokeWidth=2;whiteSpace=wrap;', node, parent, drawGraph);
                break;
            case 'stadium':
                v = simpleShape('rounded=1;whiteSpace=wrap;arcSize=50;strokeWidth=2;', node, parent, drawGraph);
                break;
            case 'subroutine':
                v = simpleShape('strokeWidth=2;shape=process;whiteSpace=wrap;size=0.04;', node, parent, drawGraph);
                break;
            case 'cylinder':
                v = simpleShape('shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=10;strokeWidth=2;whiteSpace=wrap;', node, parent, drawGraph);
                break;
            case 'circle':
                v = simpleShape('ellipse;aspect=fixed;strokeWidth=2;whiteSpace=wrap;', node, parent, drawGraph);
                break;
            case 'odd':
            case 'odd_right':
            case 'rect_left_inv_arrow':
                v = simpleShape('shape=mxgraph.arrows2.arrow;dy=0;dx=0;notch=20;strokeWidth=2;whiteSpace=wrap;', node, parent, drawGraph);
                break;
            case 'trapezoid':
                v = simpleShape('shape=trapezoid;perimeter=trapezoidPerimeter;fixedSize=1;strokeWidth=2;whiteSpace=wrap;', node, parent, drawGraph);
                break;
            case 'inv_trapezoid':
                v = simpleShape('shape=trapezoid;perimeter=trapezoidPerimeter;fixedSize=1;strokeWidth=2;whiteSpace=wrap;flipV=1;', node, parent, drawGraph);
                break;
            case 'lean_right':
                v = simpleShape('shape=parallelogram;perimeter=parallelogramPerimeter;fixedSize=1;strokeWidth=2;whiteSpace=wrap;', node, parent, drawGraph);
                break;
            case 'lean_left':
                v = simpleShape('shape=parallelogram;perimeter=parallelogramPerimeter;fixedSize=1;strokeWidth=2;whiteSpace=wrap;flipH=1;', node, parent, drawGraph);
                break;
            case 'doublecircle':
                v = simpleShape('ellipse;shape=doubleEllipse;aspect=fixed;strokeWidth=2;whiteSpace=wrap;', node, parent, drawGraph);
                break;
            case 'hexagon':
                v = simpleShape('shape=hexagon;perimeter=hexagonPerimeter2;fixedSize=1;strokeWidth=2;whiteSpace=wrap;', node, parent, drawGraph);
                break;
            case 'start':
                node.labelText = '';
                v = simpleShape('ellipse;fillColor=strokeColor;', node, parent, drawGraph);
                break;
            case 'end':
                node.labelText = '';
                v = simpleShape('ellipse;shape=endState;fillColor=strokeColor;', node, parent, drawGraph);
                break;
            case 'roundedWithTitle':
                v = simpleShape('swimlane;fontStyle=1;align=center;verticalAlign=middle;startSize=25;container=0;collapsible=0;rounded=1;arcSize=14;dropTarget=0;', node, parent, drawGraph);
                break;
            case 'fork':
            case 'join':
                node.labelText = '';
                v = simpleShape('shape=line;strokeWidth=' + (node.height - 5) + ';', node, parent, drawGraph);
                break;
            case 'divider':
                node.labelText = '';
                v = simpleShape('fillColor=#F7F7F7;dashed=1;dashPattern=12 12;', node, parent, drawGraph);
                break;
            case 'lifeline':
            case 'actorLifeline':
                node.labelText = node.description;
                v = simpleShape('shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;container=1;dropTarget=0;collapsible=0;recursiveResize=0;' +
                    'outlineConnect=0;portConstraint=eastwest;newEdgeStyle={"edgeStyle":"elbowEdgeStyle","elbow":"vertical","curved":0,"rounded":0};' +
                    (node.type == 'actor' ? 'participant=umlActor;verticalAlign=bottom;labelPosition=center;verticalLabelPosition=top;align=center;' : '') +
                    'size=' + node.size + ';', node, parent, drawGraph);
                break;
            case 'activation':
                v = simpleShape('points=[];perimeter=orthogonalPerimeter;outlineConnect=0;targetShapes=umlLifeline;portConstraint=eastwest;newEdgeStyle={"edgeStyle":"elbowEdgeStyle","elbow":"vertical","curved":0,"rounded":0}', node, parent, drawGraph);
                break;
            case 'seqNote':
                node.labelText = node.message;
                v = simpleShape('fillColor=#ffff88;strokeColor=#9E916F;', node, parent, drawGraph);
                break;
            case 'loop':
                node.labelText = node.type || '';
                var typeWidth = node.type? node.type.length * 10 : 0;
                v = simpleShape('shape=umlFrame;dashed=1;pointerEvents=0;dropTarget=0;strokeColor=#B3B3B3;height=20;width=' + typeWidth, node, parent, drawGraph);

                insertVertex(drawGraph, v, null, formatLabel(node.title), typeWidth, 0, node.width - typeWidth, 20, 'text;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;');

                for (var i = 0; node.sections != null && i < node.sections.length; i++)
                {
                    var section = node.sections[i];
                    var sectionTitle = node.sectionTitles[i];
                    insertVertex(drawGraph, v, null, formatLabel(sectionTitle.message), 0, section.y - node.y, node.width, section.height, 'shape=line;dashed=1;whiteSpace=wrap;verticalAlign=top;labelPosition=center;verticalLabelPosition=middle;align=center;strokeColor=#B3B3B3;');
                }
                break;
            case 'erdEntity':
                var attributes = node.entityData.attributes;
                var rowCount = attributes.length;
                var rowHeight = (node.height - 25) / rowCount; // 25 is header height
                var y = rowHeight;
                var typeColW = 0, nameColW = 0, keyColW = 0, commentColW = 0;

                for (var i = 0; i < attributes.length; i++)
                {
                    typeColW = Math.max(typeColW, attributes[i].attributeType.length * 6);
                    nameColW = Math.max(nameColW, attributes[i].attributeName.length * 6);
                    keyColW = Math.max(keyColW, attributes[i].attributeKeyType? attributes[i].attributeKeyType.length * 10 : 0);
                    commentColW = Math.max(commentColW, attributes[i].attributeComment? attributes[i].attributeComment.length * 6 : 0);
                }

                v = insertVertex(drawGraph, parent, null, formatLabel(node.labelText), node.x, node.y, Math.max(nameColW + typeColW + keyColW + commentColW, node.width), node.height, 'shape=table;startSize=' + (attributes.length == 0? node.height : 25) +
                    ';container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=1;fontStyle=1;align=center;resizeLast=1;');

                for (var i = 0; i < attributes.length; i++)
                {
                    var row = insertVertex(drawGraph, v, null, null, 0, y, node.width, rowHeight, 'shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;top=0;left=0;right=0;bottom=0;');
                    var cellStyle = 'shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;align=left;spacingLeft=2;overflow=hidden;fontSize=11;';
                    insertVertex(drawGraph, row, null, formatLabel(attributes[i].attributeType), 0, 0, typeColW, rowHeight, cellStyle);
                    insertVertex(drawGraph, row, null, formatLabel(attributes[i].attributeName), 0, 0, Math.max(nameColW, node.width - typeColW - keyColW - commentColW), rowHeight, cellStyle);

                    if (keyColW > 0)
                    {
                        insertVertex(drawGraph, row, null, formatLabel(attributes[i].attributeKeyType), 0, 0, keyColW, rowHeight, cellStyle);
                    }

                    if (commentColW > 0)
                    {
                        insertVertex(drawGraph, row, null, formatLabel(attributes[i].attributeComment), 0, 0, commentColW, rowHeight, cellStyle);
                    }

                    y += rowHeight;
                }
                break;
            case 'element':
            case 'requirement':
                var isElement = node.shape == 'element';
                annotationsStr = '<<' + (isElement? 'Element' : node.data.type) + '>>\n';
                v = insertVertex(drawGraph, parent, null, annotationsStr + formatLabel(node.data.name), node.x, node.y, node.width, node.height, 'swimlane;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=40;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=1;collapsible=0;marginBottom=0;');

                var bodyTxt = '';

                if (isElement)
                {
                    bodyTxt = 'Type: ' + node.data.type + '\n' + 'Doc Ref: ' + (node.data.docRef || 'None');
                }
                else
                {
                    bodyTxt = 'Id: ' + node.data.id + '\n' + 'Text: ' + node.data.text + '\n' + 'Risk: ' + node.data.risk + '\n' + 'Verification: ' + node.data.verifyMethod;
                }

                insertVertex(drawGraph, v, null, formatLabel(bodyTxt), 0, 40, node.width, node.height - 40, 'text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacing=6;overflow=hidden;rotatable=0;connectable=0;');
                break;
            case 'rectCloud':
                v = simpleShape('shape=mxgraph.basic.cloud_rect;strokeWidth=2;', node, parent, drawGraph);
                break;
            case 'cloud':
                v = simpleShape('ellipse;shape=cloud;strokeWidth=2;', node, parent, drawGraph);
                break;
            case 'roundedRect':
                v = simpleShape('rounded=1;arcSize=40;strokeWidth=2', node, parent, drawGraph);
                break;
            case 'smilingFace':
                v = simpleShape('shape=image;imageAspect=0;aspect=fixed;image=https://cdn1.iconfinder.com/data/icons/hawcons/32/699734-icon-6-smiling-face-128.png;imageBackground=default;', node, parent, drawGraph);
                break;
            case 'sadFace':
                v = simpleShape('shape=image;imageAspect=0;aspect=fixed;image=https://cdn1.iconfinder.com/data/icons/hawcons/32/699741-icon-7-sad-face-128.png;imageBackground=default;', node, parent, drawGraph);
                break;
            case 'neutralFace':
                v = simpleShape('shape=image;imageAspect=0;aspect=fixed;image=https://cdn1.iconfinder.com/data/icons/hawcons/32/699721-icon-5-neutral-face-128.png;imageBackground=default;', node, parent, drawGraph);
                break;
            case 'gitBranch':
                v = simpleShape('line;dashed=1;strokeWidth=1;labelPosition=left;verticalLabelPosition=middle;align=right;verticalAlign=middle;spacingRight=35;spacingTop=0;spacing=0;backgroundOutline=0;html=1;' +
                    (node.isHidden? 'strokeColor=none;' : 'labelBackgroundColor=' + node.color[1] + ';fontColor=' + node.color[0] + ';'), node, parent, drawGraph);
                break;
            case 'gitCommit':
                var typeStyle = '';

                switch (node.type)
                {
                    case 0:
                    case 1:
                        typeStyle = 'strokeColor=' + node.color[1] + ';fillColor=' + node.color[1];
                        break;
                    case 2:
                        typeStyle = 'strokeColor=none;fillColor=none';
                        break;
                    case 3:
                        node.labelText = '';
                        typeStyle = 'strokeColor=' + node.color[1] + ';fillColor=#efefef';
                        break;
                    case 4:
                        node.labelText = '';
                        typeStyle = 'strokeColor=#efefef;fillColor=#efefef';
                        break;
                }

                v = simpleShape('ellipse;verticalAlign=middle;labelPosition=left;verticalLabelPosition=middle;align=right;rotation=300;spacingRight=4;labelBackgroundColor=default;strokeWidth=5;' +
                    typeStyle + ';', node, parent, drawGraph);

                switch (node.type)
                {
                    case 1:
                        insertVertex(drawGraph, v, null, '', 5, 5, node.width - 10, node.height - 10, 'shape=umlDestroy;strokeWidth=3;strokeColor=#efefef;');
                        break;
                    case 2:
                        insertVertex(drawGraph, v, null, '', 0, 0, node.width, node.height, 'strokeWidth=5;strokeColor=#1c1c1c;fillColor=#efefef;');
                        break;
                    case 4:
                        insertVertex(drawGraph, v, null, '', 2, 2, node.width - 5, node.height - 5, 'shape=image;imageAspect=0;aspect=fixed;image=https://cdn3.iconfinder.com/data/icons/essential-pack/32/68-Cherry-128.png');
                        break;
                }

                if (node.tag)
                {
                    var tagW = node.tag.length * 6 + 20;
                    // Note that the tag is rotated 90 degrees and flipped vertically (so width and height are swapped)
                    var t = insertVertex(drawGraph, v, null, formatLabel(node.tag), 0, -tagW / 2 - node.width / 2 - 5, node.height, tagW, 'shape=loopLimit;size=8;rotation=90;horizontal=0;flipV=1;fillColor=#efefef;strokeColor=#DEDEDE;');
                }
                break;
            default: // rectangle
                v = simpleShape('whiteSpace=wrap;strokeWidth=2;', node, parent, drawGraph);
        }

        //Links
        if (node.link)
        {
            drawGraph.setAttributeForCell(v, 'link', node.link);
        }

        if (node.linkTarget)
        {
            drawGraph.setAttributeForCell(v, 'linkTarget', node.linkTarget);
        }

        if (node.tooltip)
        {
            drawGraph.setAttributeForCell(v, 'tooltip', node.tooltip);
        }

        return v;
    };

    function getEdgeHead(type, prefex)
    {
        switch (type)
        {
            case 'extension':
                return prefex + 'Arrow=block;' + prefex + 'Size=16;' + prefex + 'Fill=0';
            case 'composition':
                return prefex + 'Arrow=diamondThin;' + prefex + 'Size=14;' + prefex + 'Fill=1';
            case 'aggregation':
                return prefex + 'Arrow=diamondThin;' + prefex + 'Size=14;' + prefex + 'Fill=0';
            case 'dependency':
                return prefex + 'Arrow=open;' + prefex + 'Size=12';
            case 'arrow_point':
                return prefex + 'Arrow=block';
            case 'arrow_open':
            case 'none':
            case undefined:
                return prefex + 'Arrow=none';
            case 'arrow_circle':
                return prefex + 'Arrow=oval;' + prefex + 'Size=10;' + prefex + 'Fill=1';
            case 'arrow_cross':
                return prefex + 'Arrow=cross';
            case 'ZERO_OR_MORE':
                return prefex + 'Arrow=ERmany;' + prefex + 'Size=10;';
            case 'ONLY_ONE':
                return prefex + 'Arrow=ERmandOne;' + prefex + 'Size=10;';
            case 'ONE_OR_MORE':
                return prefex + 'Arrow=ERoneToMany;' + prefex + 'Size=10;';
            case 'ZERO_OR_ONE':
                return prefex + 'Arrow=ERzeroToOne;' + prefex + 'Size=10;';
            case 'circlePlus':
                return prefex + 'Arrow=circlePlus;' + prefex + 'Size=10;' + prefex + 'Fill=0';
        }
    };

    function getEdgeStyle(edgeInfo)
    {
        var style = [edgeInfo.isOrth? 'edgeStyle=orthogonalEdgeStyle' : 'curved=1'];

        if (edgeInfo.relationship)
        {
            var type = edgeInfo.relationship.type;

            if (edgeInfo.relationship.relSpec)
            {
                var relSpec = edgeInfo.relationship.relSpec;
                edgeInfo.arrowTypeStart = relSpec.cardB;
                edgeInfo.arrowTypeEnd = relSpec.cardA;
                edgeInfo.pattern = relSpec.relType == 'NON_IDENTIFYING'? 'dashed' : 'solid';
            }
            else if (type)
            {
                var isContains = type == 'contains';
                edgeInfo.pattern = isContains ? 'solid' : 'bigDashed';
                edgeInfo.arrowTypeStart = isContains ? 'circlePlus' : 'none';
                edgeInfo.arrowTypeEnd = isContains ? 'none' : 'dependency';
            }
        }

        switch (edgeInfo.pattern)
        {
            case 'dotted':
                style.push('dashed=1;dashPattern=2 3');
                break;
            case 'dashed':
                style.push('dashed=1');
                break;
            case 'bigDashed':
                style.push('dashed=1;dashPattern=8 8');
                break;
        }

        if (edgeInfo.classes && edgeInfo.classes.indexOf('note-edge') != -1)
        {
            style.push('dashed=1');
        }

        style.push(getEdgeHead(edgeInfo.arrowTypeStart, 'start'));
        style.push(getEdgeHead(edgeInfo.arrowTypeEnd, 'end'));

        if (edgeInfo.thickness == 'thick')
        {
            style.push('strokeWidth=3');
        }

        return style.join(';') + ';';
    };

    function twoDec(num)
    {
        return Math.round(num * 100) / 100;
    }

    function addEdge(edge, edgeInfo, nodesMap, parent, drawGraph, isElk)
    {
        var source = nodesMap[edgeInfo.fromCluster || edge.v];
        var target = nodesMap[edgeInfo.toCluster || edge.w];
        var sameParent = isElk && source.parent == target.parent;

        if (sameParent)
        {
            parent = source.parent;
        }

        var lbl = edgeInfo.label;

        if (edgeInfo.relationship)
        {
            lbl = edgeInfo.relationship.type? '<<' + edgeInfo.relationship.type + '>>' :
                edgeInfo.relationship.roleA;
        }

        var e = drawGraph.insertEdge(parent, null, formatLabel(lbl), source, target, getEdgeStyle(edgeInfo));

        var svalign = 'middle';
        var shalign = 'center';
        var tvalign = 'middle';
        var thalign = 'center';
        var edgeLabelStyle = 'edgeLabel;resizable=0;labelBackgroundColor=none;fontSize=12;';

        if (source != null && source.geometry != null && target != null && target.geometry != null)
        {
            svalign = (source.geometry.y + source.geometry.height < target.geometry.y) ? 'top' : 'bottom';
            tvalign = (source.geometry.y + source.geometry.height < target.geometry.y) ? 'bottom' : 'top';
            shalign = (source.geometry.x + source.geometry.width < target.geometry.x) ? 'left' : 'right';
            thalign = (source.geometry.x + source.geometry.width < target.geometry.x) ? 'right' : 'left';
        }

        if (edgeInfo.startLabelRight)
        {
            var subLbl = insertVertex(drawGraph, e, null, formatLabel(edgeInfo.startLabelRight), -1, 0, 0, 0,
                edgeLabelStyle + 'align=' + shalign + ';verticalAlign=' + svalign + ';');
            subLbl.geometry.relative = true;
        }

        if (edgeInfo.endLabelLeft)
        {
            var subLbl = insertVertex(drawGraph, e, null, formatLabel(edgeInfo.endLabelLeft), 0.5, 0, 0, 0,
                edgeLabelStyle + 'align=' + thalign + ';verticalAlign=' + tvalign + ';');
            subLbl.geometry.relative = true;
        }

        e.geometry.points = [];

        // Clustom edge points are not supported yet as they are weird
        if (edgeInfo.fromCluster || edgeInfo.toCluster)
        {
            edgeInfo.points = null;
        }

        if (edgeInfo.points && edgeInfo.points.length >= 2)
        {
            var ps = edgeInfo.points.shift();
            var pe = edgeInfo.points.pop();
            var srcGeo = source.geometry, trgGeo = target.geometry;
            // Elk only
            var pSrcGeo = !sameParent && source.parent && source.parent.geometry? source.parent.geometry : {x: 0, y: 0, width: 0, height: 0};
            var pTrgGeo = !sameParent && target.parent && target.parent.geometry? target.parent.geometry : {x: 0, y: 0, width: 0, height: 0};

            var exitX = twoDec((ps.x - srcGeo.x - pSrcGeo.x) / srcGeo.width);
            var exitY = twoDec((ps.y - srcGeo.y - pSrcGeo.y) / srcGeo.height);
            var entryX = twoDec((pe.x - trgGeo.x - pTrgGeo.x) / trgGeo.width);
            var entryY = twoDec((pe.y - trgGeo.y - pTrgGeo.y) / trgGeo.height);

            e.style += 'exitX=' + exitX + ';exitY=' + exitY + ';entryX=' + entryX + ';entryY=' + entryY + ';';

            var lastP = ps;

            for (var i = 0; i < edgeInfo.points.length; i++)
            {
                var pt = edgeInfo.points[i];
                var nextP = edgeInfo.points[i + 1] || pe;
                // Skip points that are on the same line
                if (!isElk && (lastP.x == pt.x || lastP.y == pt.y) &&
                    nextP != null && (nextP.x == pt.x || nextP.y == pt.y)) continue;
                lastP = pt;
                e.geometry.points.push(new mxPoint(Math.round(pt.x), Math.round(pt.y)));
            }

            // TODO Support label offset
            // Label offset
            /*if (isElk && edgeInfo.lblInfo)
            {
                var lInfo = edgeInfo.lblInfo;
                insertVertex(drawGraph, e, e.id + 'lbl', e.value, lInfo.x, lInfo.y, lInfo.width, lInfo.height, 'edgeLabel;', 0);
                e.value = '';
            }*/
        }

        return e;
    };

    function findTerminal(msg, nodesMap, coord)
    {
        var msgX = msg[coord];

        // Find closest activation
        for (var key in nodesMap)
        {
            if (key.indexOf('a') == -1) continue;

            var x = parseInt(key.substring(0, key.length - 1));

            if (Math.abs(x - msgX) > 20) continue;

            var arr = nodesMap[key];

            for (var i = 0; i < arr.length; i++)
            {
                var geo = arr[i].geometry;

                if (geo.y <= msg.stopy && geo.y + geo.height >= msg.stopy)
                {
                    return arr[i];
                }
            }
        }

        // Find closest actor
        for (var key in nodesMap)
        {
            if (key.indexOf('a') > -1) continue;

            var x = parseInt(key);

            if (Math.abs(x - msgX) <= 20)
            {
                return nodesMap[key];
            }
        }

        return null; // No terminal found
    };

    function addMessage(msg, nodesMap, drawGraph)
    {
        var edgeStyle = 'endArrow=block;';

        switch (msg.type)
        {
            case 0:
                // Nothing
                break;
            case 1:
                edgeStyle = 'dashed=1;dashPattern=2 3;endArrow=block;';
                break;
            case 3:
                edgeStyle = 'endArrow=cross;';
                break;
            case 4:
                edgeStyle = 'endArrow=cross;dashed=1;dashPattern=2 3;';
                break;
            case 5:
                edgeStyle = 'endArrow=none;';
                break;
            case 6:
                edgeStyle = 'endArrow=none;dashed=1;dashPattern=2 3;';
                break;
            case 24:
                edgeStyle = 'endArrow=classic;endSize=10;';
                break;
            case 25:
                edgeStyle = 'endArrow=classic;dashed=1;dashPattern=2 3;endSize=10;';
                break;
        }

        var source = findTerminal(msg, nodesMap, 'startx');
        var target = findTerminal(msg, nodesMap, 'stopx');
        var selfLoop = source == target;
        var e = drawGraph.insertEdge(null, null, formatLabel(msg.message), source, target,
            (selfLoop? 'curved=1;' : 'verticalAlign=bottom;edgeStyle=elbowEdgeStyle;elbow=vertical;curved=0;rounded=0;') +
            edgeStyle);

        if (selfLoop)
        {
            e.geometry.points = [new mxPoint(Math.round(msg.startx + 50), Math.round(msg.stopy - 30)),
                new mxPoint(Math.round(msg.startx + 50), Math.round(msg.stopy))];
        }
        else
        {
            e.geometry.points = [new mxPoint(Math.round(Math.min(msg.startx, msg.stopx) + msg.width / 2), Math.round(msg.stopy))];
        }

        if (msg.sequenceVisible)
        {
            var seq = drawGraph.insertVertex(e, e.id + 'seq', msg.sequenceIndex, 0, 0,
                14, 14, 'ellipse;aspect=fixed;fillColor=#000000;align=center;fontColor=#FFFFFF;', true);
            var rtol = msg.startx > msg.stopx;
            seq.geometry.offset = selfLoop? new mxPoint(-57, -22) : new mxPoint((rtol? 1 : -1) * msg.width/2 - (rtol? 14 : 0), -7);
        }

        return e;
    };

    function convertSequenceDiagram(graph, drawGraph)
    {
        var nodesMap = {}, actorWidth = 0;

        for (var i = 0; i < graph.actors.length; i++)
        {
            var actor = graph.actors[i];

            if (nodesMap[actor.name]) continue;

            actor.shape = actor.type == 'actor' ? 'actorLifeline' : 'lifeline' ;
            actor.size = actor.height;
            actor.height = graph.verticalPos;
            actor.y = 0; // TODO Confirm this is correct as y sometimes is huge for no reason
            var v = addNode(actor, null, drawGraph, true);
            nodesMap[actor.x + actor.width / 2] = v;
            actorWidth = Math.max(actorWidth, actor.width);
            nodesMap[actor.name] = v;
        }

        var msgYs = [];
        for (var i = 0; i < graph.messages.length; i++)
        {
            msgYs.push(graph.messages[i].stopy);
        }

        msgYs.sort(function(a, b) { return a - b; });
        graph.activations.sort(function(a, b) { return a.starty - b.starty; })
        var j = 0;

        for (var i = 0; i < graph.activations.length; i++)
        {
            var activation = graph.activations[i];
            var actor = nodesMap[activation.actor];
            var actorGeo = actor.geometry;

            // Correct the y position of the activation
            while (j < msgYs.length && msgYs[j] < activation.starty)
            {
                j++;
            }

            activation.x = activation.startx - actorGeo.x;
            activation.y = msgYs[j - 1]; // actorGeo.y is zero
            activation.width = activation.stopx - activation.startx;
            activation.height = activation.stopy - msgYs[j - 1];
            activation.shape = 'activation';
            var v = addNode(activation, actor, drawGraph, true);

            function addToNodesMap(key, v)
            {
                if (nodesMap[key] == null)
                {
                    nodesMap[key] = [];
                }

                nodesMap[key].push(v);
            }

            addToNodesMap(activation.startx + 'a', v);
            addToNodesMap(activation.stopx + 'a', v);
        }

        for (var i = 0; i < graph.loops.length; i++)
        {
            var loop = graph.loops[i];

            loop.x = loop.startx;
            loop.y = loop.starty;
            loop.width = loop.stopx - loop.startx;
            loop.height = loop.stopy - loop.starty;
            loop.shape = 'loop';
            addNode(loop, null, drawGraph, true);
        }

        for (var i = 0; i < graph.messages.length; i++)
        {
            addMessage(graph.messages[i], nodesMap, drawGraph);
        }

        for (var i = 0; i < graph.notes.length; i++)
        {
            var note = graph.notes[i];
            note.shape = 'seqNote';
            note.x = note.startx;
            note.y = note.starty;
            addNode(note, null, drawGraph, true);
        }

        for (var i = 0; i < graph.actors.length; i++)
        {
            var actor = graph.actors[i];

            if (actor.type == 'actor' && !actor.secondPass)
            {
                var v = nodesMap[actor.name];

                for (var j = 0; v.children && j < v.children.length; j++)
                {
                    v.children[j].geometry.x -= (v.geometry.width - 35) / 2;
                }

                v.geometry.width = 35;
                actor.secondPass = true;
            }
        }
    };

    function convertGraph(graph, parent, drawGraph)
    {
        var nodes = graph._nodes, nodesMap = {};
        var edges = graph._edgeObjs;
        var edgesInfo = graph._edgeLabels;
        // TODO Add support for _parent (issue: Edge is not added to subgraph)

        for (var id in nodes)
        {
            nodesMap[id] = addNode(nodes[id], parent, drawGraph);

            if (nodes[id].clusterNode)
            {
                delete nodes[id].graph._nodes[id]; // The same node is added to subgraph also
                convertGraph(nodes[id].graph, nodesMap[id], drawGraph);
            }
        }

        for (var id in edges)
        {
            addEdge(edges[id], edgesInfo[id], nodesMap, parent, drawGraph);
        }
    };

    function convertGitGraphDiagram(graph, drawGraph)
    {
        var branchMap = {}, maxX = 0, colorIndex = 0;

        for (var commit in graph.commitPos)
        {
            maxX = Math.max(maxX, graph.commitPos[commit].x);
        }

        for (var name in graph.branchPos)
        {
            var branch = graph.branchPos[name];
            branch.shape = 'gitBranch';
            branch.labelText = name;
            branch.y = branch.pos;
            branch.x = 0;
            branch.width = maxX + 50;
            branch.height = 1;
            branch.isHidden = !graph.gitGraphConfig.showBranches;
            var color = grayscaleColors[colorIndex++ % grayscaleColors.length];
            branch.color = color;
            var n = addNode(branch, null, drawGraph, true);
            n.value = graph.gitGraphConfig.showBranches? '<p style="line-height: 50%;">&nbsp;&nbsp;' + mxUtils.htmlEntities(n.value) + '&nbsp;&nbsp;</p>' : '';
            branchMap[branch.pos] = { node: n, color: color };
        }

        var commitMap = {}, edges = [];

        for (var name in graph.commitPos)
        {
            var commit = graph.commitPos[name];
            Object.assign(commit, graph.commits[name]);
            var branch = branchMap[commit.y];
            commit.shape = 'gitCommit';
            commit.pos = commit.y;
            commit.y = 0;
            commit.width = 20;
            commit.height = 20;
            commit.labelText = graph.gitGraphConfig.showCommitLabel? name : '';
            commit.color = branch.color;
            commit.type = commit.customType || commit.type;
            commitMap[name] = addNode(commit, branch.node, drawGraph);
            branch.commitList = branch.commitList || [];
            branch.commitList.push(commit.x);

            for (var i = 0; i < commit.parents.length; i++)
            {
                var parent = commit.parents[i];
                var parentCommit = graph.commitPos[parent];
                parentPos = parentCommit.pos != null ? parentCommit.pos : parentCommit.y;
                edges.push({ source: parent, target: name, color: commit.pos >= parentPos ? branch.color : branchMap[parentPos].color, clr2: branch.color});
            }
        }

        for (var i = 0; i < edges.length; i++)
        {
            var edge = edges[i];
            var src = commitMap[edge.source], trg = commitMap[edge.target];
            var e = drawGraph.insertEdge(null, null, null, src, trg, 'rounded=1;endArrow=none;endFill=0;strokeWidth=8;');

            var srcY =  src.parent.geometry.y, trgY = trg.parent.geometry.y;
            var overlapClr = false;

            if (srcY != trgY)
            {
                var tgrBranch = branchMap[trgY], count = 0;

                for (var j = 0; j < tgrBranch.commitList.length; j++)
                {
                    var commitX = tgrBranch.commitList[j];

                    if (commitX > src.geometry.x && commitX < trg.geometry.x)
                    {
                        count++;
                    }
                }

                if (count > 0)
                {
                    var midY = (srcY + trgY) / 2;
                    e.geometry.points = [new mxPoint(Math.round(src.geometry.x + src.geometry.width / 2), Math.round(midY)),
                        new mxPoint(Math.round(trg.geometry.x + trg.geometry.width / 2), Math.round(midY))];
                    overlapClr = true;
                }
                else
                {
                    var maxY = Math.max(srcY, trgY);
                    e.geometry.points = [new mxPoint(srcY == maxY? Math.round(trg.geometry.x + trg.geometry.width / 2) :
                        Math.round(src.geometry.x + src.geometry.width / 2), Math.round(maxY))];
                }
            }

            if (overlapClr)
            {
                e.style += 'strokeColor=' + edge.clr2[1] + ';';
            }
            else
            {
                e.style += 'strokeColor=' + edge.color[1] + ';';
            }
        }
    };

    function convertJourneyDiagram(graph, drawGraph)
    {
        var tasks = graph.tasks, lastSection = null;
        var minX = Number.MAX_SAFE_INTEGER, maxX = 0, minY = Number.MAX_SAFE_INTEGER;

        for (var i = 0; i < tasks.length; i++)
        {
            var task = tasks[i];
            task.shape = 'lifeline';
            task.description = task.task;
            task.size = task.height * 3;
            task.width *= 3;
            task.height = 300;
            minX = Math.min(minX, task.x);
            maxX = Math.max(maxX, task.x + task.width);
            minY = Math.min(minY, task.y + task.size);
            var v = addNode(task, null, drawGraph, true);
            var face = {shape: task.score < 3? 'sadFace' : (task.score > 3? 'smilingFace' : 'neutralFace'), x: task.width / 2 - 15, y: 270 - task.score * 25, width: 30, height: 30};
            addNode(face, v, drawGraph, true);

            var index = 0;
            // actors
            for (var key in task.actors)
            {
                insertVertex(drawGraph, v, null, null, 5 + index++ * 8, -6, 12, 12, 'ellipse;aspect=fixed;fillColor=' + task.actors[key].color);
            }

            if (lastSection != task.section)
            {
                lastSection = task.section;
                task.labelText = task.section;
                task.shape = 'rect';
                task.height = task.size;
                task.y -= task.height + 10;
                v = addNode(task, null, drawGraph, true);
            }
        }

        var e = drawGraph.insertEdge(null, null, null, null, null, 'endArrow=block;strokeWidth=3;endFill=1;');
        e.geometry.setTerminalPoint(new mxPoint(Math.round(minX), Math.round(minY + 50)), true);
        e.geometry.setTerminalPoint(new mxPoint(Math.round(maxX + 50), Math.round(minY + 50)), false);
        e.geometry.relative = true;

        if (graph.title)
        {
            insertVertex(drawGraph, null, null, formatLabel(graph.title), minX, 0, graph.title.length * 12, 40, 'text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontSize=20;fontStyle=1');
        }

        // Legend
        for (var key in graph.actors)
        {
            var actor = graph.actors[key];
            insertVertex(drawGraph, null, null, key, 10, 70 + actor.position * 20, 12, 12, 'ellipse;aspect=fixed;labelPosition=right;verticalLabelPosition=middle;align=left;verticalAlign=middle;spacingLeft=10;fillColor=' + actor.color);
        }
    };

    function convertMindmapDiagram(graph, drawGraph)
    {
        var nodes = graph._private.elements;
        var nodesMap = {}, edgesMap = {};

        for (var i = 0; i < nodes.length; i++)
        {
            var node = nodes[i]._private.data;

            switch (node.type)
            {
                case 1:
                    node.shape = 'roundedRect';
                    break;
                case 2:
                    node.shape = 'rect';
                    break;
                case 3:
                    node.shape = 'circle';
                    node.width = Math.max(node.height, node.width);
                    node.height = node.width;
                    break;
                case 4:
                    node.shape = 'cloud';
                    break;
                case 5:
                    node.shape = 'rectCloud';
                    break;
                case 6:
                    node.shape = 'hexagon';
                    break;
                default:
                    node.shape = 'rect';
                    node.type = 'round';
            }

            if (!isNaN(node.x) && !isNaN(node.y))
            {
                nodesMap[node.id] = addNode(node, null, drawGraph);
            }

            var edges = nodes[i]._private.edges;

            for (var j = 0; j < edges.length; j++)
            {
                var edge = edges[j]._private.data;
                edgesMap[edge.id] = edge;
            }
        }

        for (var id in edgesMap)
        {
            var edgeInfo = edgesMap[id];
            drawGraph.insertEdge(null, null, null, nodesMap[edgeInfo.source], nodesMap[edgeInfo.target], 'endArrow=none');
        }
    };

    function convertELKDiagram(graph, nodesMap, parent, drawGraph)
    {
        var nodes = graph.children;
        var edges = graph.edges;

        for (var i = 0; i < nodes.length; i++)
        {
            var node = nodes[i];
            var id = node.id;
            node.shape = node.type;
            var v = addNode(node, parent, drawGraph, true);
            nodesMap[id] = v;

            if (node.children && node.children.length > 0)
            {
                convertELKDiagram(node, nodesMap, v, drawGraph);
            }
        }

        for (var i = 0; edges != null && i < edges.length; i++)
        {
            var edge = edges[i];
            edge.v = edge.sourceId;
            edge.w = edge.targetId;
            var edgeInfo = edge.edgeData || {};

            if (edge.labels && edge.labels[0])
            {
                edgeInfo.label = edge.labels[0].text;
                edgeInfo.lblInfo = edge.labels[0];
            }

            edgeInfo.isOrth = true;

            if (edge.sections && edge.sections[0])
            {
                edgeInfo.points = edge.sections[0].bendPoints? edge.sections[0].bendPoints : [];

                if (edge.sections[0].startPoint)
                {
                    edgeInfo.points.unshift(edge.sections[0].startPoint);
                }

                if (edge.sections[0].endPoint)
                {
                    edgeInfo.points.push(edge.sections[0].endPoint);
                }
            }

            addEdge(edge, edgeInfo, nodesMap, parent, drawGraph, true);
        }
    };

    function convertDiagram(graph)
    {
        var drawGraph = createMxGraph();

        if (diagramtype == 'gitgraph')
        {
            convertGitGraphDiagram(graph, drawGraph);
        }
        else if (diagramtype == 'journey')
        {
            convertJourneyDiagram(graph, drawGraph);
        }
        else if (diagramtype == 'Mindmap')
        {
            convertMindmapDiagram(graph, drawGraph);
        }
        else if (diagramtype == 'sequenceDiagram')
        {
            convertSequenceDiagram(graph, drawGraph);
        }
        else if (diagramtype == 'flowchart-elk')
        {
            convertELKDiagram(graph, {}, null, drawGraph);
        }
        else
        {
            if (diagramtype == 'ERD')
            {
                for (var key in extra)
                {
                    extra[key].title = key;
                    extra[key.replace(/-|_/g, '')] = extra[key];
                }

                for (var key in graph._nodes)
                {
                    var data = extra[key.split('-')[1]];
                    var node = graph._nodes[key];
                    node.shape = 'erdEntity';
                    node.labelText = data.title;
                    node.entityData = data;
                }
            }
            else if (diagramtype == 'requirements')
            {
                for (var key in graph._nodes)
                {
                    var node = graph._nodes[key];
                    node.shape = extra.elements[key]? 'element' : 'requirement';
                    node.data = extra.elements[key] || extra.requirements[key];
                }
            }

            convertGraph(graph, null, drawGraph);
        }

        var codec = new mxCodec();
        var node = codec.encode(drawGraph.getModel());
        return mxUtils.getXml(node);
    }
};

mxMermaidToDrawio.listeners = [];
mxMermaidToDrawio.timeouts = [];

mxMermaidToDrawio.addListener = function(fn)
{
    mxMermaidToDrawio.listeners.push(fn);
    // For cases when mermaid add a new diagram type and it's not supported yet
    mxMermaidToDrawio.timeouts.push(setTimeout(function()
    {
        fn(EditorUi.prototype.emptyDiagramXml);
    }, 5000));
}

mxMermaidToDrawio.resetListeners = function()
{
    mxMermaidToDrawio.listeners = [];
    mxMermaidToDrawio.timeouts = [];
}
