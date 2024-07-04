/**
 * Installing themes.
 */
Editor.themes.push('simple');
Editor.themes.push('sketch');
Editor.themes.push('atlas');

(function()
{
    /**
     *
     */
    var editorUiSwitchCssForTheme = EditorUi.prototype.switchCssForTheme;

    EditorUi.prototype.switchCssForTheme = function(value)
    {
        if (value == 'simple' || value == 'sketch')
        {
            if (this.sketchStyleElt == null)
            {
                this.sketchStyleElt = document.createElement('style');
                this.sketchStyleElt.setAttribute('type', 'text/css');
                this.sketchStyleElt.innerHTML = Editor.createMinimalCss();
                document.getElementsByTagName('head')[0].appendChild(this.sketchStyleElt);
            }
        }
        else
        {
            editorUiSwitchCssForTheme.apply(this, arguments);
        }
    };

    /**
     *
     */
    editorUiCreateWrapperForTheme = EditorUi.prototype.createWrapperForTheme;

    EditorUi.prototype.createWrapperForTheme = function(value)
    {
        if (value == 'simple' || value == 'sketch')
        {
            if (this.sketchWrapperElt == null)
            {
                this.sketchWrapperElt = document.createElement('div');
                this.sketchWrapperElt.style.cssText = 'position:absolute;' +
                    'top:0px;left:0px;right:0px;bottom:0px;overflow:hidden;';
            }

            if (value == 'sketch')
            {
                this.sketchWrapperElt.className = 'geSketch';
            }

            this.diagramContainer.parentNode.appendChild(this.sketchWrapperElt);
            this.sketchWrapperElt.appendChild(this.diagramContainer);
        }
        else
        {
            editorUiCreateWrapperForTheme.apply(this, arguments);
        }
    };

    /**
     *
     */
    var editorUiCreateMainMenuForTheme = EditorUi.prototype.createMainMenuForTheme;

    EditorUi.prototype.createMainMenuForTheme = function(value)
    {
        if (value == 'simple' || value == 'sketch')
        {
            if (this.sketchMainMenuElt == null)
            {
                this.sketchMainMenuElt = document.createElement('div');
                this.sketchMainMenuElt.style.cssText = 'position:absolute;' +
                    'padding:9px 12px;overflow:hidden;white-space:nowrap;' +
                    'user-select:none;box-sizing:border-box;';

                var elt = this.createMenu((value == 'simple') ? 'view' : 'diagram',
                    (value == 'simple') ? Editor.thinViewImage : Editor.menuImage);
                this.sketchMainMenuElt.appendChild(elt);

                if (value == 'simple')
                {
                    this.sketchMainMenuElt.className = 'geToolbarContainer geSimpleMainMenu';
                    this.sketchMainMenuElt.style.display = 'flex';
                    this.sketchMainMenuElt.style.height = '52px';
                    this.sketchMainMenuElt.style.justifyContent = 'start';
                    this.sketchMainMenuElt.style.alignItems = 'center';
                    this.sketchMainMenuElt.style.top = '0px';
                    this.sketchMainMenuElt.style.left = '0px';
                    this.sketchMainMenuElt.style.right = '0px';
                    this.sketchMainMenuElt.style.gap = '10px';
                    elt.style.flexShrink = '0';
                    elt.style.opacity = '0.7';
                }
                else
                {
                    this.sketchMainMenuElt.appendChild(this.createMenuItem('delete', Editor.trashImage));
                    this.sketchMainMenuElt.appendChild(this.createMenuItem('undo', Editor.undoImage));
                    this.sketchMainMenuElt.appendChild(this.createMenuItem('redo', Editor.redoImage));
                    this.sketchMainMenuElt.className = 'geToolbarContainer';
                    this.sketchMainMenuElt.style.borderRadius = '4px';
                    this.sketchMainMenuElt.style.height = '44px';
                    this.sketchMainMenuElt.style.left = '10px';
                    this.sketchMainMenuElt.style.top = '10px';
                    this.sketchMainMenuElt.style.zIndex = '1';
                }

                this.sketchWrapperElt.appendChild(this.sketchMainMenuElt);
            }
        }
        else
        {
            editorUiCreateMainMenuForTheme.apply(this, arguments);
        }
    };

    /**
     *
     */
    var editorUiCreateFooterMenuForTheme = EditorUi.prototype.createFooterMenuForTheme;

    EditorUi.prototype.createFooterMenuForTheme = function(value)
    {
        if (value == 'simple' || value == 'sketch')
        {
            if (this.sketchFooterMenuElt == null)
            {
                this.sketchFooterMenuElt = document.createElement('div');
                this.sketchFooterMenuElt.className = 'geToolbarContainer';
                var footer = this.sketchFooterMenuElt;

                if (value != 'simple')
                {
                    var pageMenu = this.createPageMenuTab(false, value != 'simple');
                    pageMenu.className = 'geToolbarButton geAdaptiveAsset';
                    pageMenu.style.cssText = 'display:inline-block;cursor:pointer;overflow:hidden;padding:4px 16px 4px 4px;' +
                        'white-space:nowrap;max-width:160px;text-overflow:ellipsis;background-position:right 0px top 8px;' +
                        'background-repeat:no-repeat;background-size:13px;background-image:url(' +
                        mxWindow.prototype.minimizeImage + ');';
                    footer.appendChild(pageMenu);

                    var updatePageName = mxUtils.bind(this, function()
                    {
                        pageMenu.innerText = '';

                        if (this.currentPage != null)
                        {
                            mxUtils.write(pageMenu, this.currentPage.getName());
                            var n = (this.pages != null) ? this.pages.length : 1;
                            var idx = this.getPageIndex(this.currentPage);
                            idx = (idx != null) ? idx + 1 : 1;
                            var id = this.currentPage.getId();
                            pageMenu.setAttribute('title', this.currentPage.getName() +
                                ' (' + idx + '/' + n + ')' + ((id != null) ?
                                    ' [' + id + ']' : ''));
                        }
                    });

                    this.editor.addListener('pagesPatched', updatePageName);
                    this.editor.addListener('pageSelected', updatePageName);
                    this.editor.addListener('pageRenamed', updatePageName);
                    this.editor.addListener('fileLoaded', updatePageName);
                    updatePageName();

                    // Page menu only visible for multiple pages
                    var pagesVisibleChanged = mxUtils.bind(this, function()
                    {
                        pageMenu.style.display = (this.isPageMenuVisible()) ? 'inline-block' : 'none';
                    });

                    this.addListener('editInlineStart', mxUtils.bind(this, function()
                    {
                        pagesVisibleChanged();
                        updatePageName();
                    }));

                    this.addListener('fileDescriptorChanged', pagesVisibleChanged);
                    this.addListener('pagesVisibleChanged', pagesVisibleChanged);
                    this.editor.addListener('pagesPatched', pagesVisibleChanged);
                    pagesVisibleChanged();

                    footer.appendChild(this.createMenuItem('zoomOut', Editor.minusImage));
                }

                var elt = this.createMenu('viewZoom', null, 'geToolbarButton');
                elt.setAttribute('title', mxResources.get('zoom'));
                elt.innerHTML = '100%';
                elt.style.cssText = 'display:inline-flex;align-items:center;position:relative;' +
                    'padding:4px;box-shadow:none;width:40px;justify-content:center;cursor:pointer;';

                if (value == 'simple')
                {
                    elt.style.borderStyle = 'solid';
                    elt.style.borderWidth = '1px';
                    elt.style.borderRadius = '4px';
                    elt.style.fontSize = '11px';
                    elt.style.fontWeight = '500';
                    elt.style.paddingTop = '4px';
                    elt.style.paddingRight = '14px';
                    elt.style.backgroundImage = 'url(' + Editor.thinExpandImage + ')';
                    elt.style.backgroundPosition = 'right 0px center';
                    elt.style.backgroundRepeat = 'no-repeat';
                    elt.style.backgroundSize = '18px';
                    elt.style.opacity = '0.7';
                    elt.style.height = '12px';
                }
                else
                {
                    elt.style.backgroundImage = 'url(' + mxWindow.prototype.minimizeImage + ')';
                    elt.style.backgroundPosition = 'right 0px top 8px';
                    elt.style.backgroundRepeat = 'no-repeat';
                    elt.style.backgroundSize = '13px';
                    elt.style.paddingRight = '16px';
                    elt.style.marginRight = '-4px';
                }

                footer.appendChild(elt);

                if (value == 'simple')
                {
                    var pagesElt = this.createMenu('pages', Editor.thinNoteImage);
                    pagesElt.style.backgroundSize = '24px';
                    pagesElt.style.display = 'inline-block';
                    pagesElt.style.width = '24px';
                    pagesElt.style.height = '30px';
                    pagesElt.style.opacity = '0.7';
                    footer.appendChild(pagesElt);

                    var undoElt = this.createMenuItem('undo', Editor.thinUndoImage);
                    undoElt.style.marginLeft = 'auto';
                    undoElt.style.flexShrink = '0';
                    undoElt.style.opacity = '0.7';
                    footer.appendChild(undoElt);

                    var redoElt = this.createMenuItem('redo', Editor.thinRedoImage);
                    redoElt.style.marginLeft = '0px';
                    redoElt.style.flexShrink = '0';
                    redoElt.style.opacity = '0.7';
                    footer.appendChild(redoElt);

                    // Page menu only visible for multiple pages
                    var refreshMenu = mxUtils.bind(this, function()
                    {
                        var iw = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

                        pagesElt.style.display = (iw < 480) ? 'none' : '';
                        elt.style.display = (iw < 750) ? 'none' : 'inline-flex';
                    });

                    mxEvent.addListener(window, 'resize', refreshMenu);
                    refreshMenu();
                }

                // Updates the label if the scale changes
                (mxUtils.bind(this, function(elt)
                {
                    // Adds shift+/alt+click on zoom label
                    mxEvent.addListener(elt, 'click', mxUtils.bind(this, function(evt)
                    {
                        if (mxEvent.isAltDown(evt))
                        {
                            this.hideCurrentMenu();
                            this.actions.get('customZoom').funct();
                            mxEvent.consume(evt);
                        }
                        // geItem is a dropdown menu, geMenuItem is a button in the toolbar
                        else if (mxEvent.isShiftDown(evt))
                        {
                            this.hideCurrentMenu();
                            this.actions.get('smartFit').funct();
                            mxEvent.consume(evt);
                        }
                    }));

                    var updateZoom = mxUtils.bind(this, function(sender, evt, f)
                    {
                        f = (f != null) ? f : 1;
                        elt.innerText = '';
                        mxUtils.write(elt, Math.round(this.editor.graph.view.scale * 100 * f) + '%');
                    });

                    this.editor.graph.view.addListener(mxEvent.EVENT_SCALE, updateZoom);
                    this.editor.addListener('resetGraphView', updateZoom);
                    this.editor.addListener('pageSelected', updateZoom);

                    // Zoom Preview
                    this.editor.graph.addListener('zoomPreview', mxUtils.bind(this, function(sender, evt)
                    {
                        updateZoom(sender, evt, evt.getProperty('factor'));
                    }));
                }))(elt);

                if (value != 'simple')
                {
                    footer.appendChild(this.createMenuItem('zoomIn', Editor.plusImage));
                }

                if (urlParams['embedInline'] == '1')
                {
                    var fullscreenElt = this.createMenuItem('fullscreen', Editor.fullscreenImage);
                    footer.appendChild(fullscreenElt);

                    var inlineFullscreenChanged = mxUtils.bind(this, function()
                    {
                        fullscreenElt.style.backgroundImage = 'url(' + ((!Editor.inlineFullscreen) ?
                            Editor.fullscreenImage : Editor.fullscreenExitImage) + ')';
                        this.inlineSizeChanged();
                        this.editor.graph.refresh();
                        this.fitWindows();
                    });

                    this.addListener('editInlineStart', mxUtils.bind(this, function()
                    {
                        fullscreenElt.style.backgroundImage = 'url(' + ((!Editor.inlineFullscreen) ?
                            Editor.fullscreenImage : Editor.fullscreenExitImage) + ')';
                    }));

                    this.addListener('inlineFullscreenChanged', inlineFullscreenChanged);
                    footer.appendChild(this.createMenuItem('exit', Editor.closeImage));
                }

                if (value == 'simple')
                {
                    this.sketchFooterMenuElt.style.cssText = 'position:relative;white-space:nowrap;gap:6px;' +
                        'user-select:none;display:flex;flex-shrink:0;flex-grow:0.5;align-items:center;';
                    this.sketchMainMenuElt.appendChild(this.sketchFooterMenuElt);
                }
                else
                {
                    this.sketchFooterMenuElt.style.cssText = 'position:absolute;right:12px;bottom:12px;height:44px;' +
                        'border-radius:4px;padding:9px 12px;overflow:hidden;z-index:1;white-space:nowrap;display:flex;' +
                        'text-align:right;user-select:none;box-sizing:border-box;';
                    this.sketchWrapperElt.appendChild(this.sketchFooterMenuElt);
                }
            }
        }
        else
        {
            editorUiCreateFooterMenuForTheme.apply(this, arguments);
        }
    };

    /**
     *
     */
    var editorUiCreatePickerMenuForTheme = EditorUi.prototype.createPickerMenuForTheme;

    EditorUi.prototype.createPickerMenuForTheme = function(value)
    {
        if (value == 'simple' || value == 'sketch')
        {
            if (this.sketchPickerMenuElt == null)
            {
                var graph = this.editor.graph;
                this.sketchPickerMenuElt = document.createElement('div');
                this.sketchPickerMenuElt.className = 'geToolbarContainer';

                var picker = this.sketchPickerMenuElt;
                mxUtils.setPrefixedStyle(picker.style, 'transition', 'transform .3s ease-out');

                var foldImg = document.createElement('a');
                foldImg.style.padding = '0px';
                foldImg.style.boxShadow = 'none';
                foldImg.className = 'geMenuItem geAdaptiveAsset';
                foldImg.style.display = (value == 'simple') ? 'inline-block' : 'block';
                foldImg.style.width = '100%';
                foldImg.style.height = '14px';
                foldImg.style.margin = '4px 0 2px 0';
                foldImg.style.backgroundImage = 'url(' + Editor.expandMoreImage + ')';
                foldImg.style.backgroundPosition = 'center center';
                foldImg.style.backgroundRepeat = 'no-repeat';
                foldImg.style.backgroundSize = '22px';
                mxUtils.setOpacity(foldImg, 40);
                foldImg.setAttribute('title', mxResources.get('collapseExpand'));
                var fmargin = foldImg.style.margin;

                var freehandElt = this.createMenuItem('insertFreehand', (value == 'simple') ?
                    Editor.thinGestureImage : Editor.freehandImage, true);
                freehandElt.style.paddingLeft = (value == 'simple') ? '0px' : '12px';
                freehandElt.style.backgroundSize = '24px';
                freehandElt.style.width = '26px';
                freehandElt.style.height = '30px';
                freehandElt.style.opacity = '0.7';

                var insertElt = this.createMenu('insert', (value == 'simple') ?
                    Editor.thinAddCircleImage : Editor.addBoxImage);
                insertElt.style.backgroundSize = '24px';
                insertElt.style.display = (value == 'simple') ? 'inline-block' : 'block';
                insertElt.style.flexShrink = '0';
                insertElt.style.width = '30px';
                insertElt.style.height = '30px';
                insertElt.style.padding = (value == 'simple') ? '0px' : '4px 4px 0px 4px';
                insertElt.style.opacity = '0.7';

                var tableElt = this.createMenu('table', Editor.thinTableImage);
                tableElt.style.backgroundSize = '24px';
                tableElt.style.padding = (value == 'simple') ? '0px' : '4px 4px 0px 4px';
                tableElt.style.display = 'inline-block';
                tableElt.style.width = '30px';
                tableElt.style.height = '30px';
                tableElt.style.opacity = '0.7';

                var shapesElt = insertElt.cloneNode(true);
                shapesElt.style.backgroundImage = 'url(' + ((value == 'simple') ?
                    Editor.thinShapesImage : Editor.shapesImage) + ')';
                shapesElt.style.backgroundSize = '24px';
                shapesElt.setAttribute('title', mxResources.get('shapes'));

                var tw = 28;
                var th = 28;

                mxEvent.addListener(shapesElt, 'click', mxUtils.bind(this, function(evt)
                {
                    if (this.isShapePickerVisible())
                    {
                        this.hideShapePicker();
                    }
                    else
                    {
                        var off = mxUtils.getOffset(shapesElt);

                        if (Editor.inlineFullscreen || this.embedViewport == null)
                        {
                            if (value == 'simple')
                            {
                                off.x -= this.diagramContainer.offsetLeft + 30;
                                off.y += shapesElt.offsetHeight - 19;
                            }
                            else
                            {
                                off.x += shapesElt.offsetWidth + 28;
                                off.y += 20;
                            }
                        }
                        else
                        {
                            off.x = 0;
                            off.y = shapesElt.offsetTop;
                        }

                        this.showShapePicker(Math.max(this.diagramContainer.scrollLeft + Math.max(24, off.x)),
                            this.diagramContainer.scrollTop + off.y, null, null, null, null,
                            mxUtils.bind(this, function(cells)
                            {
                                return graph.getCenterInsertPoint(graph.getBoundingBoxFromGeometry(cells, true));
                            }), value == 'simple', false);
                    }

                    mxEvent.consume(evt);
                }));

                insertElt.style.backgroundSize = '24px';

                if (value == 'simple')
                {
                    insertElt.style.flexShrink = '0';
                }
                else
                {
                    insertElt.style.marginBottom = '4px';
                }

                var collapsed = false;

                var initPicker = mxUtils.bind(this, function(force)
                {
                    if (force || (document.body != null &&
                        document.body.contains(picker)))
                    {
                        if (!graph.isEnabled())
                        {
                            freehandElt.classList.add('mxDisabled');
                            insertElt.classList.add('mxDisabled');
                            tableElt.classList.add('mxDisabled');
                            shapesElt.classList.add('mxDisabled');
                        }
                        else
                        {
                            freehandElt.classList.remove('mxDisabled');
                            insertElt.classList.remove('mxDisabled');
                            tableElt.classList.remove('mxDisabled');
                            shapesElt.classList.remove('mxDisabled');
                        }

                        function addKey(elt, key, kx, ky)
                        {
                            kx = (kx != null) ? kx : 30;
                            ky = (ky != null) ? ky : 26;

                            elt.style.position = 'relative';
                            elt.style.overflow = 'visible';

                            var div = document.createElement('div');
                            div.style.position = 'absolute';
                            div.style.fontSize = '8px';
                            div.style.left = kx + 'px';
                            div.style.top = ky + 'px';
                            mxUtils.write(div, key);
                            elt.appendChild(div);
                        };

                        function addElt(elt, title, cursor, key, kx, ky)
                        {
                            if (title != null)
                            {
                                elt.setAttribute('title', title);
                            }

                            elt.style.cursor = 'pointer';
                            elt.style.margin = (value == 'simple') ? '0px' : '8px 0px 8px 2px';
                            elt.style.display = (value == 'simple') ? 'inline-block' : 'block';
                            picker.appendChild(elt);

                            if (value == 'simple')
                            {
                                elt.style.opacity = '0.7';
                            }
                            else if (key != null)
                            {
                                addKey(elt, key, kx, ky);
                            }

                            if (!graph.isEnabled())
                            {
                                elt.classList.add('mxDisabled');
                            }

                            return elt;
                        };

                        picker.innerText = '';

                        if (!collapsed)
                        {
                            var iw = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

                            // Thinner previews in simple toolbar
                            if (value == 'simple')
                            {
                                this.sidebar.graph.cellRenderer.minSvgStrokeWidth = 0.9;
                            }

                            // Append sidebar elements
                            var margin = (value == 'simple') ? '0px' : '4px 0px 6px 2px';
                            var em = '1px 0px 1px 2px';

                            if (value != 'simple' || iw >= 660)
                            {
                                var textElt = this.sidebar.createVertexTemplate(graph.appendFontSize('text;strokeColor=none;' +
                                    'fillColor=none;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;',
                                    graph.vertexFontSize), 60, 30, 'Text', mxResources.get('text') + ' (A)', true, false,
                                    null, value != 'simple', null, tw + 10, th + 10, value == 'simple' ?
                                        Editor.thinTextImage : null, true);

                                if (value == 'simple')
                                {
                                    textElt.className = 'geToolbarButton';
                                    textElt.style.opacity = '0.7';
                                }

                                addElt(textElt, mxResources.get('text') + ' (A)', null, 'A', 32).
                                    style.margin = (value == 'simple') ?
                                    '0 -8px 0 0' : '0 0 0 -2px';
                            }

                            var boxElt = this.sidebar.createVertexTemplate('rounded=0;whiteSpace=wrap;html=1;', 160, 80, '',
                                mxResources.get('rectangle') + ' (D)', true, false, null, value != 'simple', null, tw, th,
                                (value == 'simple') ? Editor.thinRectangleImage : null)

                            if (value == 'simple')
                            {
                                if (iw >= 600)
                                {
                                    boxElt.className = 'geToolbarButton';
                                    boxElt.style.opacity = '0.7';
                                    addElt(boxElt, mxResources.get('rectangle') + ' (D)', null, 'D').style.margin = '0 -4px 0 0';
                                }

                                if (iw >= 390)
                                {
                                    this.sketchPickerMenuElt.appendChild(shapesElt);
                                }

                                if (iw >= 440)
                                {
                                    addElt(freehandElt, mxResources.get('freehand') + ' (X)', null, 'X');
                                }

                                if (iw >= 500)
                                {
                                    this.sketchPickerMenuElt.appendChild(tableElt);
                                }
                            }
                            else
                            {
                                addElt(this.sidebar.createVertexTemplate('shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;' +
                                    'fontColor=#000000;darkOpacity=0.05;fillColor=#FFF9B2;strokeColor=none;fillStyle=solid;' +
                                    'direction=west;gradientDirection=north;gradientColor=#FFF2A1;shadow=1;size=20;pointerEvents=1;',
                                    140, 160, '', mxResources.get('note') + ' (S)', true, false, null, true, null, tw, th),
                                    mxResources.get('note') + ' (S)', null, 'S').style.margin = margin;
                                addElt(boxElt, mxResources.get('rectangle') + ' (D)', null, 'D').style.margin = margin;
                                addElt(this.sidebar.createVertexTemplate('ellipse;whiteSpace=wrap;html=1;', 160, 100, '',
                                    mxResources.get('ellipse') + ' (F)', true, false, null, true, null, tw, th),
                                    mxResources.get('ellipse') + ' (F)', null, 'F').style.margin = margin;

                                var edgeStyle = 'edgeStyle=none;orthogonalLoop=1;jettySize=auto;html=1;';
                                var cell = new mxCell('', new mxGeometry(0, 0, this.editor.graph.defaultEdgeLength + 20, 0), edgeStyle);
                                cell.geometry.setTerminalPoint(new mxPoint(0, 0), true);
                                cell.geometry.setTerminalPoint(new mxPoint(cell.geometry.width, 0), false);
                                cell.geometry.points = [];
                                cell.geometry.relative = true;
                                cell.edge = true;

                                addElt(this.sidebar.createEdgeTemplateFromCells([cell],
                                    cell.geometry.width, cell.geometry.height, mxResources.get('line') + ' (C)',
                                    true, null, value != 'simple', false, null, tw, th),
                                    mxResources.get('line') + ' (C)', null, 'C').margin = em;

                                cell = cell.clone();
                                cell.style = edgeStyle + 'shape=flexArrow;rounded=1;startSize=8;endSize=8;';
                                cell.geometry.width = this.editor.graph.defaultEdgeLength + 20;
                                cell.geometry.setTerminalPoint(new mxPoint(0, 20), true);
                                cell.geometry.setTerminalPoint(new mxPoint(cell.geometry.width, 20), false);

                                addElt(this.sidebar.createEdgeTemplateFromCells([cell],
                                    cell.geometry.width, 40, mxResources.get('arrow'),
                                    true, null, true, false, null, tw, th),
                                    mxResources.get('arrow')).
                                    style.margin = em;

                                addElt(freehandElt, mxResources.get('freehand') + ' (X)', null, 'X');
                                this.sketchPickerMenuElt.appendChild(shapesElt);
                            }

                            if (value != 'simple' || iw > 320)
                            {
                                this.sketchPickerMenuElt.appendChild(insertElt);
                            }
                        }

                        if (value != 'simple' && urlParams['embedInline'] != '1')
                        {
                            picker.appendChild(foldImg);
                        }

                        this.sidebar.graph.cellRenderer.minSvgStrokeWidth = this.sidebar.minThumbStrokeWidth;
                    }
                });

                mxEvent.addListener(foldImg, 'click', mxUtils.bind(this, function()
                {
                    if (collapsed)
                    {
                        mxUtils.setPrefixedStyle(picker.style, 'transform', 'translate(0, -50%)');
                        picker.style.padding = '0px 4px 4px';
                        picker.style.width = '48px';
                        picker.style.top = '50%';
                        picker.style.bottom = '';
                        picker.style.height = '';
                        foldImg.style.backgroundImage = 'url(' + Editor.expandMoreImage + ')';
                        foldImg.style.width = '100%';
                        foldImg.style.height = '14px';
                        foldImg.style.margin = fmargin;
                        collapsed = false;
                        initPicker();
                    }
                    else
                    {
                        picker.innerText = '';
                        picker.appendChild(foldImg);
                        mxUtils.setPrefixedStyle(picker.style, 'transform', 'translate(0, 0)');
                        picker.style.width = 'auto';
                        picker.style.bottom = '12px';
                        picker.style.padding = '0px';
                        picker.style.top = '';
                        foldImg.style.backgroundImage = 'url(' + Editor.expandLessImage + ')';
                        foldImg.style.width = '24px';
                        foldImg.style.height = '24px';
                        foldImg.style.margin = '0px';
                        collapsed = true;
                    }
                }));

                var lastWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
                var currentThread = null;

                mxEvent.addListener(window, 'resize', function()
                {
                    var currentWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

                    if (currentWidth != lastWidth)
                    {
                        lastWidth = currentWidth;

                        if (currentThread != null)
                        {
                            window.clearTimeout(currentThread);
                        }

                        currentThread = window.setTimeout(function()
                        {
                            currentThread = null;
                            initPicker();
                        }, 200);
                    }
                });

                this.editor.addListener('fileLoaded', initPicker);
                this.addListener('sketchModeChanged', initPicker);
                this.addListener('currentThemeChanged', initPicker);
                this.addListener('lockedChanged', initPicker);
                this.addListener('darkModeChanged', mxUtils.bind(this, function()
                {
                    if (!Editor.enableCssDarkMode)
                    {
                        initPicker();
                    }
                }));

                initPicker(true);

                if (value == 'simple')
                {
                    this.sketchPickerMenuElt.style.cssText = 'position:relative;white-space:nowrap;user-select:none;' +
                        'display:flex;align-items:center;justify-content:flex-end;flex-grow:1;gap:6px;flex-shrink:0;';
                    this.sketchMainMenuElt.appendChild(this.sketchPickerMenuElt);
                }
                else
                {
                    this.sketchPickerMenuElt.style.cssText = 'position:absolute;left:10px;border-radius:4px;' +
                        'padding:0px 4px 4px;white-space:nowrap;max-height:100%;z-index:1;width:48px;' +
                        'box-sizing:border-box;transform:translate(0, -50%);top:50%;user-select:none;';
                    this.sketchWrapperElt.appendChild(this.sketchPickerMenuElt);
                }

                // Disables built-in pan and zoom on touch devices
                if (mxClient.IS_POINTER)
                {
                    this.sketchPickerMenuElt.style.touchAction = 'none';
                }
            }
        }
        else
        {
            editorUiCreatePickerMenuForTheme.apply(this, arguments);
        }
    };

    /**
     *
     */
    var editorUiCreateMenubarForTheme = EditorUi.prototype.createMenubarForTheme;

    EditorUi.prototype.createMenubarForTheme = function(value)
    {
        if (value == 'simple' || value == 'sketch')
        {
            if (this.sketchMenubarElt == null)
            {
                this.sketchMenubarElt = document.createElement('div');
                this.sketchMenubarElt.className = 'geToolbarContainer';

                var css = 'display:flex;white-space:nowrap;user-select:none;justify-content:flex-end;' +
                    'align-items:center;flex-wrap:nowrap;gap:6px;';

                if (value == 'simple')
                {
                    this.sketchMenubarElt.style.cssText = 'position:relative;flex-grow:0.5;' +
                        'overflow:visible;' + ((urlParams['embed'] != '1') ?
                            'flex-shrink:0;' : 'min-width:0;') + css;

                    if (this.commentElt == null)
                    {
                        this.commentElt = this.createMenuItem('comments', Editor.thinCommentImage, true);
                        this.commentElt.style.paddingLeft = '0px';
                        this.commentElt.style.backgroundSize = '24px';
                        this.commentElt.style.width = '26px';
                        this.commentElt.style.height = '30px';
                        this.commentElt.style.opacity = '0.7';
                    }

                    if (this.shareElt == null && urlParams['embed'] != '1' &&
                        this.getServiceName() == 'draw.io')
                    {
                        this.shareElt = this.createMenu('share', Editor.thinUserAddImage);
                        this.shareElt.style.backgroundSize = '24px';
                        this.shareElt.style.display = 'inline-block';
                        this.shareElt.style.flexShrink = '0';
                        this.shareElt.style.width = '24px';
                        this.shareElt.style.height = '30px';
                        this.shareElt.style.opacity = '0.7';

                        if (this.isStandaloneApp())
                        {
                            this.shareElt.style.backgroundImage = 'url(' +
                                Editor.thinShareImage + ')';
                        }
                        else
                        {
                            var networkListener = mxUtils.bind(this, function()
                            {
                                var title = mxResources.get('share');
                                var img = Editor.thinUserAddImage;
                                var status = this.getNetworkStatus();

                                if (status != null)
                                {
                                    title = title + ' (' + status + ')';
                                    img = Editor.thinUserFlashImage;
                                }

                                this.shareElt.style.backgroundImage = 'url(' + img + ')';
                                this.shareElt.setAttribute('title', title);
                            });

                            this.addListener('realtimeStateChanged', networkListener);
                            this.editor.addListener('statusChanged', networkListener);
                            mxEvent.addListener(window, 'offline', networkListener);
                            mxEvent.addListener(window, 'online', networkListener);
                            networkListener();
                        }
                    }

                    if (this.mainMenuElt == null)
                    {
                        this.mainMenuElt = this.createMenu('diagram', Editor.thinMenuImage);
                        this.mainMenuElt.style.backgroundSize = '24px';
                        this.mainMenuElt.style.display = 'inline-block';
                        this.mainMenuElt.style.flexShrink = '0';
                        this.mainMenuElt.style.width = '24px';
                        this.mainMenuElt.style.height = '30px';
                        this.mainMenuElt.style.opacity = '0.7';
                    }

                    if (this.formatElt == null)
                    {
                        this.formatElt = this.createMenuItem('format', Editor.thinDesignImage, true);
                        this.formatElt.style.backgroundSize = '24px';
                        this.formatElt.style.marginLeft = (urlParams['embed'] != '1') ? 'auto' : '0';
                        this.formatElt.style.flexShrink = '0';
                        this.formatElt.style.width = '20px';
                        this.formatElt.style.opacity = '0.7';

                        var cls = this.formatElt.className + ' geToggleItem';
                        this.formatElt.className = cls + ((this.formatWidth == 0) ? '' : ' geActiveItem');

                        this.addListener('formatWidthChanged', function()
                        {
                            this.formatElt.className = cls + ((this.formatWidth == 0) ? '' : ' geActiveItem');
                        });
                    }
                }
                else
                {
                    this.sketchMenubarElt.style.cssText = 'position:absolute;right:12px;top:10px;height:44px;' +
                        'border-radius:4px;overflow:hidden;user-select:none;max-width:calc(100% - 170px);' +
                        'box-sizing:border-box;justify-content:flex-end;z-index:1;padding:7px 12px;' + css;
                    this.sketchWrapperElt.appendChild(this.sketchMenubarElt);
                }

                if (urlParams['embedInline'] != '1')
                {
                    // Moves menu away if picker overlaps
                    var refreshMenu = mxUtils.bind(this, function()
                    {
                        if (Editor.currentTheme == 'sketch')
                        {
                            var overflow = (this.sketchPickerMenuElt.offsetTop -
                                this.sketchPickerMenuElt.offsetHeight / 2 < 58);
                            this.sketchMainMenuElt.style.left = (overflow) ? '70px' : '10px';
                            this.sketchMenubarElt.style.maxWidth = (overflow) ?
                                'calc(100% - 230px)' : 'calc(100% - 170px)';
                        }
                        else if (Editor.currentTheme == 'simple')
                        {
                            var iw = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

                            if (this.commentElt != null)
                            {
                                this.commentElt.style.display = (iw > 560 && this.commentsSupported()) ? '' : 'none';
                            }

                            if (this.shareElt != null)
                            {
                                this.shareElt.style.display = (iw > 360) ? '' : 'none';
                            }
                        }
                    });

                    refreshMenu();
                    mxEvent.addListener(window, 'resize', refreshMenu);
                    this.editor.addListener('fileLoaded', refreshMenu);
                }

                if (urlParams['embed'] != '1' && this.getServiceName() != 'atlassian')
                {
                    this.installStatusMinimizer(this.sketchMenubarElt);
                }
            }

            if (value == 'simple')
            {
                if (this.buttonContainer != null)
                {
                    this.buttonContainer.style.padding = '0px';
                    this.sketchMenubarElt.appendChild(this.buttonContainer);

                    if (this.formatElt != null && urlParams['embed'] == '1')
                    {
                        this.formatElt.style.marginLeft = '';
                    }
                }

                if (this.commentElt != null)
                {
                    this.sketchMenubarElt.appendChild(this.commentElt);
                }

                if (this.shareElt != null)
                {
                    this.sketchMenubarElt.appendChild(this.shareElt);
                }

                this.sketchMenubarElt.appendChild(this.mainMenuElt);
                this.sketchMenubarElt.appendChild(this.formatElt);
            }

            if (this.statusContainer != null)
            {
                this.statusContainer.style.flexGrow = '1';
                this.statusContainer.style.flexShrink = '1';
                this.statusContainer.style.marginTop = '0px';

                if (value != 'simple')
                {
                    this.sketchMenubarElt.appendChild(this.statusContainer);
                }
                else
                {
                    this.statusContainer.style.justifyContent = 'center';
                    this.statusContainer.style.width = '22%';
                }
            }

            if (value != 'simple' && this.userElement != null)
            {
                this.userElement.style.flexShrink = '0';
                this.userElement.style.top = '';
                this.sketchMenubarElt.appendChild(this.userElement);
            }

            var elt = this.menubar.langIcon;

            if (elt != null)
            {
                elt.style.position = '';
                elt.style.height = '21px';
                elt.style.width = '21px';
                elt.style.flexShrink = '0';
                elt.style.opacity = '0.7';

                this.sketchMenubarElt.appendChild(elt);
            }

            if (value == 'simple')
            {
                this.sketchMainMenuElt.appendChild(this.statusContainer);
                this.sketchMainMenuElt.appendChild(this.sketchMenubarElt);
            }
            else if (this.buttonContainer != null)
            {
                this.buttonContainer.style.padding = '0px';
                this.sketchMenubarElt.appendChild(this.buttonContainer);
            }
        }
        else
        {
            editorUiCreateMenubarForTheme.apply(this, arguments);
        }
    };

})();
