(function () {

    var _token = null;

    window.OwnCloudClient = function (editorUi)
    {
        DrawioClient.call(this, editorUi, 'owncloudauth');
    };

    // Extends DrawioClient
    mxUtils.extend(OwnCloudClient, DrawioClient);

    /**
     * Default extension for new files.
     */
    OwnCloudClient.prototype.extension = '.drawio';

    /**
     * Base URL for API calls.
     */
    OwnCloudClient.prototype.baseUrl = DRAWIO_OWNCLOUD_URL;

    OwnCloudClient.prototype.baseHostUrl = DRAWIO_OWNCLOUD_URL;

    /**
     * Name for the auth token header.
     */
    OwnCloudClient.prototype.authToken = 'Token';

    /**
     * Maximum file size of the GitHub REST API.
     */
    OwnCloudClient.prototype.maxFileSize = 50000000 /*50MB*/;

    window.addEventListener('message', function (e) {
        if(window.onOwnCloudCallback != null && e.source.name.startsWith("owncloud")){
            // console.log(e.data)
            window.onOwnCloudCallback(e.data)
        }
    })

    OwnCloudClient.prototype.authenticate = function(success, error)
    {
        if (window.onOwnCloudCallback == null)
        {
            var auth = mxUtils.bind(this, function()
            {
                var acceptAuthResponse = true;

                this.ui.showAuthDialog(this, true, mxUtils.bind(this, function(remember, authSuccess)
                {
                    var win = window.open(window.DRAWIO_SERVER_URL + 'extend/owncloud/login.html', "owncloudLogin");

                    if (win != null)
                    {
                        window.onOwnCloudCallback = mxUtils.bind(this, function(newAuthInfo)
                        {
                            if (acceptAuthResponse)
                            {
                                window.onOwnCloudCallback = null;
                                acceptAuthResponse = false;

                                if (newAuthInfo == null)
                                {
                                    error({message: mxResources.get('accessDenied'), retry: auth});
                                }
                                else
                                {
                                    if (authSuccess != null)
                                    {
                                        authSuccess();
                                    }

                                    _token = JSON.parse(newAuthInfo).token;
                                    this.setUser(null);

                                    if (remember)
                                    {
                                        this.setPersistentToken(_token);
                                    }

                                    success();
                                }
                                if (win != null)
                                {
                                    win.close()
                                }
                            }
                        });
                    }
                    else
                    {
                        error({message: mxResources.get('serviceUnavailableOrBlocked'), retry: auth});
                    }
                }), mxUtils.bind(this, function()
                {
                    if (acceptAuthResponse)
                    {
                        window.onOwnCloudCallback = null;
                        acceptAuthResponse = false;
                        error({message: mxResources.get('accessDenied'), retry: auth});
                    }
                }));
            });

            auth();
        }
        else
        {
            error({code: App.ERROR_BUSY});
        }
    };


    /**
     * Authorizes the client, gets the userId and calls <open>.
     */
    OwnCloudClient.prototype.executeRequest = function(req, success, error, ignoreNotFound, returnNotFound)
    {
        var doExecute = mxUtils.bind(this, function(failOnAuth)
        {
            var acceptResponse = true;

            var timeoutThread = window.setTimeout(mxUtils.bind(this, function()
            {
                acceptResponse = false;
                error({code: App.ERROR_TIMEOUT, retry: fn});
            }), this.ui.timeout);

            var temp = this.authToken + ' ' + _token;

            req.setRequestHeaders = function(request, params)
            {
                request.setRequestHeader('Authorization', temp);
            };

            req.send(mxUtils.bind(this, function()
            {
                window.clearTimeout(timeoutThread);

                var authorizeApp = mxUtils.bind(this, function()
                {
                    // Pauses spinner while showing dialog
                    var resume = this.ui.spinner.pause();

                    this.showAuthorizeDialog(mxUtils.bind(this, function()
                    {
                        resume();
                        fn();
                    }), mxUtils.bind(this, function()
                    {
                        this.ui.hideDialog();
                        error({name: 'AbortError'});
                    }));
                });

                if (acceptResponse)
                {
                    if ((req.getStatus() >= 200 && req.getStatus() <= 299) ||
                        (ignoreNotFound && req.getStatus() == 404))
                    {
                        success(req);
                    }
                    else if (req.getStatus() === 401)
                    {
                        if (!failOnAuth)
                        {
                            this.authenticate(function()
                            {
                                doExecute(true);
                            }, error);
                        }
                        else
                        {
                            error({code: req.getStatus(), message: mxResources.get('accessDenied'), retry: mxUtils.bind(this, function()
                                {
                                    this.authenticate(function()
                                    {
                                        fn(true);
                                    }, error);
                                })});
                        }
                    }
                    else if (req.getStatus() === 403)
                    {
                        var tooLarge = false;

                        try
                        {
                            var temp = JSON.parse(req.getText());

                            if (temp != null && temp.message == 'Resource not accessible by integration')
                            {
                                authorizeApp();
                            }
                            else
                            {
                                if (temp != null && temp.errors != null && temp.errors.length > 0)
                                {
                                    tooLarge = temp.errors[0].code == 'too_large';
                                }

                                error({message: mxResources.get((tooLarge) ? 'drawingTooLarge' : 'forbidden')});
                            }
                        }
                        catch (e)
                        {
                            error({message: mxResources.get((tooLarge) ? 'drawingTooLarge' : 'forbidden')});
                        }
                    }
                    else if (req.getStatus() === 404)
                    {
                        if (returnNotFound)
                        {
                            error({code: req.getStatus(), message: this.getErrorMessage(req, mxResources.get('fileNotFound'))});
                        }
                        else
                        {
                            authorizeApp();
                        }
                    }
                    else if (req.getStatus() === 409)
                    {
                        // Special case: flag to the caller that there was a conflict
                        error({code: req.getStatus(), status: 409});
                    }
                    else
                    {
                        error({code: req.getStatus(), message: this.getErrorMessage(req, mxResources.get('error') + ' ' + req.getStatus())});
                    }
                }
            }), mxUtils.bind(this, function(err)
            {
                window.clearTimeout(timeoutThread);

                if (acceptResponse)
                {
                    error(err);
                }
            }));
        });

        var fn = mxUtils.bind(this, function(failOnAuth)
        {
            if (this.user == null)
            {
                this.updateUser(function()
                {
                    fn(true);
                }, error, failOnAuth);
            }
            else
            {
                doExecute(failOnAuth);
            }
        });

        _token = _token != null ? _token : this.getPersistentToken();
        if (_token == null)
        {
            this.authenticate(function()
            {
                fn(true);
            }, error);
        }
        else
        {
            fn(false);
        }
    };




    /**
     * Checks if the client is authorized and calls the next step.
     */
    OwnCloudClient.prototype.getFile = function(path, success, error, asLibrary, checkExists, knownRefPos){
        var tokens = path.split('/');
        var repo_id = tokens[0]
        var filepath = tokens.slice(1, tokens.length - 1).join('/');
        var filename = tokens[tokens.length - 1]

        // get download url
        var req = new mxXmlRequest(this.baseUrl + '/api2/repos/' + repo_id +
            '/file/?p=' + encodeURIComponent(filepath + '/' + filename), null, 'GET');
        this.executeRequest(req, mxUtils.bind(this, function (req)
        {
            this.ui.tryAndHandle(mxUtils.bind(this, function ()
            {
                var downloadUrl = req.getText().slice(1, -1);

                // download file
                var downloadReq = new mxXmlRequest(downloadUrl, null, 'GET');
                this.executeRequest(downloadReq, mxUtils.bind(this, function(req)
                {
                    try
                    {
                        // set Title
                        this.ui.fname.innerText = '';
                        mxUtils.write(this.ui.fname, filename);
                        this.ui.fname.setAttribute('title', filename + ' - ' + mxResources.get('rename'));
                        this.ui.getCurrentFile().title = filename;

                        var content = req.getText()
                        success(new OwnCloudFile(this.ui, content, {
                            'repo_id': repo_id, 'name': filename, 'path': filepath,
                            'isNew': false,
                        }))

                    }
                    catch (e)
                    {
                        error(e);
                    }
                }), error);

            }), error)
        }), error, true);

    }


    /**
     * Translates this point by the given vector.
     *
     * @param {number} dx X-coordinate of the translation.
     * @param {number} dy Y-coordinate of the translation.
     */
    OwnCloudClient.prototype.insertFile = function(filename, data, success, error, asLibrary, folderId, base64Encoded)
    {
        asLibrary = (asLibrary != null) ? asLibrary : false;

        var index = folderId.lastIndexOf('(');
        var tokens = folderId.substring(0, index).split('/');

        var repo = tokens[0];
        var path = tokens.slice(1, tokens.length).join('/');
        var repo_id = folderId.substring(index).slice(1, -1);

        var dir = (path != null && path.length > 0) ? '?p=' + encodeURIComponent(path) : '';

        var req = new mxXmlRequest(this.baseUrl + '/api2/repos/' + repo_id +
            '/dir/' + dir, null, 'GET');

        var newFile = mxUtils.bind(this,function (meta) {
            success(new OwnCloudFile(this.ui, data, meta));
        })

        var checkExists = mxUtils.bind(this, function () {
            this.executeRequest(req, mxUtils.bind(this, function(req)
            {
                try
                {
                    var files = JSON.parse(req.getText());

                    for (let i = 0; i < files.length; i++)
                    {
                        if (files[i]['name'] === filename)
                        {
                            var resume = this.ui.spinner.pause();
                            this.ui.confirm(mxResources.get('replaceIt', [filename]), function()
                            {
                                resume();
                                newFile({'repo_id': repo_id, 'name': filename, 'path': path,
                                    'isNew': false,})
                            }, function()
                            {
                                resume();
                                error()
                            });
                            return;
                        }
                    }
                    // no exist
                    newFile({'repo_id': repo_id, 'name': filename, 'path': path,
                        'isNew': true})
                }
                catch (e)
                {
                    error(e);
                }
            }), error, null, true);
        })
        checkExists()
    };


    /**
     * Translates this point by the given vector.
     *
     * @param {number} dx X-coordinate of the translation.
     * @param {number} dy Y-coordinate of the translation.
     */
    OwnCloudClient.prototype.saveFile = function(file, success, error, overwrite, message)
    {

        // success(new Yun139File(this.ui, data, {'groupId': groupId,
        //     'name': filename, 'path': path, 'isNew': isNew}));
        var repo_id = file.meta.repo_id;
        var path = file.meta.path;
        var filename = file.meta.name;

        var fn = mxUtils.bind(this, function(data)
        {
            this.writeFile(file, repo_id, path, filename, data,
                mxUtils.bind(this, function(req)
                {
                    success(req.getText());
                }), mxUtils.bind(this, function(err)
                {
                    error(err);
                }));
        });

        var fn2 = mxUtils.bind(this, function()
        {
            if (this.ui.useCanvasForExport && /(\.png)$/i.test(filename))
            {
                var p = this.ui.getPngFileProperties(this.ui.fileNode);

                this.ui.getEmbeddedPng(mxUtils.bind(this, function(data)
                {
                    fn(data);
                }), error, (this.ui.getCurrentFile() != file) ?
                    file.getData() : null, p.scale, p.border);
            }
            else
            {
                fn(file.getData());
            }
        });

        fn2();
    };


    function xmlStringToFile(xmlString, fileName) {
        // 创建一个Blob对象
        var blob = new Blob([xmlString], { type: 'text/xml' });
        // 创建一个File对象
        var file = new File([blob], fileName, { type: 'text/xml' });

        return file;
    }

    /**
     *
     */
    OwnCloudClient.prototype.writeFile = function(file, repo_id, path, filename, data, success, error)
    {
        if (data.length >= this.maxFileSize)
        {
            error({message: mxResources.get('drawingTooLarge') + ' (' +
                    this.ui.formatFileSize(data.length) + ' / 1 MB)'});
        }
        else
        {
            var dir = (path != null && path.length > 0) ? '?p=' + encodeURIComponent(path) : '';

            var req = new mxXmlRequest(this.baseUrl + '/api2/repos/' + repo_id +
                '/upload-link/' + dir, null, 'GET');

            this.executeRequest(req, mxUtils.bind(this, function(req)
            {
                try
                {
                    var uploadLink = req.getText().slice(1, -1)

                    const form = new FormData();
                    form.append('file', xmlStringToFile(data, filename));
                    form.append('parent_dir', (path != null && path.length > 0) ? path : '/');
                    form.append('replace', '1');

                    var req2 = new mxXmlRequest(uploadLink, form, 'POST');

                    this.executeRequest(req2, mxUtils.bind(this, function (req) {
                        success(req);
                    }), error);
                }
                catch (e)
                {
                    error(e);
                }
            }), error);
        }
    };

    /**
     * Checks if the client is authorized and calls the next step.
     */
    OwnCloudClient.prototype.pickFolder = function(fn)
    {
        this.showOwnCloudDialog(false, fn, true);
    };

    /**
     * Checks if the client is authorized and calls the next step.
     */
    OwnCloudClient.prototype.pickFile = function(fn)
    {
        fn = (fn != null) ? fn : mxUtils.bind(this, function(path)
        {
            this.ui.loadFile('H' + encodeURIComponent(path));
        });

        this.showOwnCloudDialog(true, fn);
    };

    /**
     *
     */
    OwnCloudClient.prototype.showOwnCloudDialog = function(showFiles, fn, hideNoFilesError)
    {
        var org = null;
        var repo = null;
        var repo_id = null;
        var path = null;

        var content = document.createElement('div');
        content.style.whiteSpace = 'nowrap';
        content.style.overflow = 'hidden';
        content.style.height = '304px';

        var hd = document.createElement('h3');
        mxUtils.write(hd, mxResources.get((showFiles) ? 'selectFile' : 'selectFolder'));
        hd.style.cssText = 'width:100%;text-align:center;margin-top:0px;margin-bottom:12px';
        content.appendChild(hd);

        var btn = this.ui.createToolbarButton(Editor.refreshImage,
            mxResources.get('refresh'), mxUtils.bind(this, function()
            {
                selectRepo();
            }));

        btn.style.position = 'absolute';
        btn.style.right = '40px';
        btn.style.top = '26px';
        content.appendChild(btn);

        var div = document.createElement('div');
        div.style.whiteSpace = 'nowrap';
        div.style.border = '1px solid lightgray';
        div.style.boxSizing = 'border-box';
        div.style.padding = '4px';
        div.style.overflow = 'auto';
        div.style.lineHeight = '1.2em';
        div.style.height = '274px';
        content.appendChild(div);

        var listItem = document.createElement('div');
        listItem.style.textOverflow = 'ellipsis';
        listItem.style.boxSizing = 'border-box';
        listItem.style.overflow = 'hidden';
        listItem.style.padding = '4px';
        listItem.style.width = '100%';


        var dlg = new CustomDialog(this.ui, content, mxUtils.bind(this, function()
            {
                fn(repo + path + '(' + repo_id + ')');
            }), null, null, null, null, null, null, null,
            !showFiles ? [[mxResources.get('newFolder'), mxUtils.bind(this, function () {
                var dlg = new FilenameDialog(this.ui, '', mxResources.get('ok'), mxUtils.bind(this, function(value)
                {
                    if (value != null)
                    {
                        this.ui.spinner.spin(div, mxResources.get('loading'))

                        var error = mxUtils.bind(this, function (err) {
                            this.ui.spinner.stop();
                            this.ui.handleError({message: err.message});
                        });

                        if (repo_id == null) {
                            const form = new FormData();
                            form.append('name', value);
                            var req = new mxXmlRequest(this.baseUrl + '/api2/repos/', form, 'POST');
                            this.executeRequest(req, mxUtils.bind(this, function (req)
                            {
                                this.ui.spinner.stop();
                                selectRepo();
                            }), error, true);
                        } else {
                            const form = new FormData();
                            form.append('operation', 'mkdir');
                            var req = new mxXmlRequest(this.baseUrl + '/api2/repos/' + repo_id +
                                '/dir/?p=' + encodeURIComponent(path + '/' + value), form, 'POST');
                            this.executeRequest(req, mxUtils.bind(this, function (req)
                            {
                                this.ui.spinner.stop();
                                selectFile(null);
                            }), error, true);
                        }
                    }
                }), mxResources.get('enterValue'));
                this.ui.showDialog(dlg.container, 300, 80, true, false);
                dlg.init();

            })]] : [], '16px');
        this.ui.showDialog(dlg.container, 420, 370, true, true);

        if (showFiles)
        {
            dlg.okButton.parentNode.removeChild(dlg.okButton);
        }

        var createLink = mxUtils.bind(this, function(label, exec, padding, underline)
        {
            var link = document.createElement('a');
            link.setAttribute('title', label);
            link.style.cursor = 'pointer';
            mxUtils.write(link,  label);
            mxEvent.addListener(link, 'click', exec);

            if (underline)
            {
                link.style.textDecoration = 'underline';
            }

            if (padding != null)
            {
                var temp = listItem.cloneNode();
                temp.style.padding = padding;
                temp.appendChild(link);

                link = temp;
            }

            return link;
        });

        var updatePathInfo = mxUtils.bind(this, function(hideRef)
        {
            var pathInfo = document.createElement('div');
            pathInfo.style.marginBottom = '8px';

            pathInfo.appendChild(createLink(org + '/' + repo, mxUtils.bind(this, function()
            {
                org = null;
                repo = null;
                repo_id = null;
                path = null;

                selectRepo();
            }), null, true));

            if (path != null && path.length > 0)
            {
                var tokens = path.split('/');

                for (var i = 0; i < tokens.length; i++)
                {
                    (function(index)
                    {
                        mxUtils.write(pathInfo, ' / ');
                        pathInfo.appendChild(createLink(tokens[index], mxUtils.bind(this, function()
                        {
                            path = tokens.slice(0, index + 1).join('/');
                            selectFile();
                        }), null, true));
                    })(i);
                }
            }

            div.appendChild(pathInfo);
        });

        var error = mxUtils.bind(this, function(err)
        {
            // Pass a dummy notFoundMessage to bypass special handling
            this.ui.handleError(err, null, mxUtils.bind(this, function()
            {
                this.ui.spinner.stop();

                if (this.getUser() != null)
                {
                    org = null;
                    repo = null;
                    repo_id = null;
                    path = null;

                    selectRepo();
                }
                else
                {
                    this.ui.hideDialog();
                }
            }), null, {});
        });

        // Adds paging for repos, branches and files (files limited to 1000 by API)
        var nextPageDiv = null;
        var scrollFn = null;
        var pageSize = 100;

        var selectFile = mxUtils.bind(this, function(page)
        {
            if (page == null)
            {
                div.innerText = '';
                page = 1;
            }

            var dir = (path != null && path.length > 0) ? '?p=' + encodeURIComponent(path) : '';

            var req = new mxXmlRequest(this.baseUrl + '/api2/repos/' + repo_id +
                '/dir/' + dir, null, 'GET');
            this.ui.spinner.spin(div, mxResources.get('loading'));
            dlg.okButton.removeAttribute('disabled');

            if (scrollFn != null)
            {
                mxEvent.removeListener(div, 'scroll', scrollFn);
                scrollFn = null;
            }

            if (nextPageDiv != null && nextPageDiv.parentNode != null)
            {
                nextPageDiv.parentNode.removeChild(nextPageDiv);
            }

            nextPageDiv = document.createElement('a');
            nextPageDiv.style.display = 'block';
            nextPageDiv.style.cursor = 'pointer';
            mxUtils.write(nextPageDiv, mxResources.get('more') + '...');

            var nextPage = mxUtils.bind(this, function()
            {
                selectFile(page + 1);
            });

            mxEvent.addListener(nextPageDiv, 'click', nextPage);

            this.executeRequest(req, mxUtils.bind(this, function(req)
            {
                this.ui.tryAndHandle(mxUtils.bind(this, function()
                {
                    this.ui.spinner.stop();

                    if (page == 1)
                    {
                        updatePathInfo();

                        div.appendChild(createLink('../ [Up]', mxUtils.bind(this, function()
                        {
                            if (path == '')
                            {
                                org = null;
                                repo = null;
                                repo_id = null;
                                path = null;

                                selectRepo();
                            }
                            else
                            {
                                var tokens = path.split('/');
                                path = tokens.slice(0, tokens.length - 1).join('/');
                                selectFile();
                            }
                        }), '4px'));
                    }

                    var files = JSON.parse(req.getText());

                    if (files == null || files.length == 0)
                    {
                        if (!hideNoFilesError)
                        {
                            mxUtils.br(div);
                            mxUtils.write(div, mxResources.get('noFiles'));
                        }
                    }
                    else
                    {
                        var gray = true;
                        var count = 0;

                        var listFiles = mxUtils.bind(this, function(showFolders)
                        {
                            for (var i = 0; i < files.length; i++)
                            {
                                (mxUtils.bind(this, function(file, idx)
                                {
                                    if (showFolders == (file.type == 'dir'))
                                    {
                                        var temp = listItem.cloneNode();
                                        temp.style.backgroundColor = (gray) ?
                                            ((Editor.isDarkMode()) ? '#000000' : '#eeeeee') : '';
                                        gray = !gray;

                                        var typeImg = document.createElement('img');
                                        typeImg.src = IMAGE_PATH + '/' + (file.type == 'dir'? 'folder.png' : 'file.png');
                                        typeImg.setAttribute('align', 'absmiddle');
                                        typeImg.style.marginRight = '4px';
                                        typeImg.style.marginTop = '-4px';
                                        typeImg.width = 20;
                                        temp.appendChild(typeImg);

                                        temp.appendChild(createLink(file.name + ((file.type == 'dir') ? '/' : ''), mxUtils.bind(this, function()
                                        {
                                            if (file.type == 'dir')
                                            {
                                                path = path + '/' + file.name;
                                                selectFile();
                                            }
                                            else if (showFiles && file.type == 'file')
                                            {
                                                this.ui.hideDialog();
                                                fn(repo_id + '/' + path + '/' + file.name);
                                            }
                                        })));


                                        var deleteImg = document.createElement('img');
                                        deleteImg.src = IMAGE_PATH + '/' + 'delete2.png';
                                        deleteImg.setAttribute('align', 'absmiddle');
                                        deleteImg.style.marginRight = '10px';
                                        deleteImg.style.float = 'right';
                                        deleteImg.style.cursor = 'pointer';
                                        deleteImg.style.display = 'none';
                                        deleteImg.width = 16;
                                        deleteImg.onclick = mxUtils.bind(this, function ()
                                        {
                                            this.ui.confirm(mxResources.get('removeIt', [file.name]), mxUtils.bind(this, function ()
                                            {
                                                this.ui.spinner.spin(div, mxResources.get('loading'));

                                                var req = new mxXmlRequest(this.baseUrl + '/api2/repos/' + repo_id +
                                                    '/file/?p=' + encodeURIComponent(path + '/' + file.name), null, 'DELETE');

                                                this.executeRequest(req, mxUtils.bind(this, function(req)
                                                {
                                                    this.ui.spinner.stop();
                                                    selectFile();

                                                }),mxUtils.bind(this, function(err)
                                                {
                                                    this.ui.spinner.stop();
                                                    this.ui.handleError({message: err.message});
                                                }));
                                            }, null));
                                        });
                                        temp.appendChild(deleteImg);

                                        var shareImg = document.createElement('img');
                                        shareImg.src = IMAGE_PATH + '/' + 'share.png';
                                        shareImg.setAttribute('align', 'absmiddle');
                                        shareImg.style.marginRight = '10px';
                                        shareImg.style.float = 'right'
                                        shareImg.style.cursor = 'pointer';
                                        shareImg.style.display = 'none';
                                        shareImg.width = 16;
                                        shareImg.onclick = mxUtils.bind(this, function ()
                                        {
                                            this.shareFile(new OwnCloudFile(this.ui, null,
                                                {'repo_id': repo_id, 'name': file.name, 'path': path,'isNew': false,}));
                                        });
                                        if (file.type != 'dir')
                                        {
                                            temp.appendChild(shareImg)
                                        }

                                        temp.addEventListener('mouseover', function() {
                                            deleteImg.style.display = 'inline-block';
                                            shareImg.style.display = 'inline-block';
                                        });
                                        temp.addEventListener('mouseout', function() {
                                            deleteImg.style.display = 'none';
                                            shareImg.style.display = 'none';
                                        });

                                        div.appendChild(temp);
                                        count++;
                                    }
                                }))(files[i], i);
                            }
                        });

                        listFiles(true);

                        if (showFiles)
                        {
                            listFiles(false);
                        }

                        // LATER: Paging not supported for contents in GitHub
                        // if (count == pageSize)
                        // {
                        // 	div.appendChild(nextPageDiv);

                        // 	scrollFn = function()
                        // 	{
                        // 		if (div.scrollTop >= div.scrollHeight - div.offsetHeight)
                        // 		{
                        // 			nextPage();
                        // 		}
                        // 	};

                        // 	mxEvent.addListener(div, 'scroll', scrollFn);
                        // }
                    }
                }));
            }), error, true);
        });


        var selectRepo = mxUtils.bind(this, function(page)
        {
            if (page == null)
            {
                div.innerText = '';
                page = 1;
            }

            var req = new mxXmlRequest(this.baseUrl + '/api2/repos/?type=mine', null, 'GET');
            dlg.okButton.setAttribute('disabled', 'disabled');
            this.ui.spinner.spin(div, mxResources.get('loading'));

            if (scrollFn != null)
            {
                mxEvent.removeListener(div, 'scroll', scrollFn);
            }

            if (nextPageDiv != null && nextPageDiv.parentNode != null)
            {
                nextPageDiv.parentNode.removeChild(nextPageDiv);
            }

            nextPageDiv = document.createElement('a');
            nextPageDiv.style.display = 'block';
            nextPageDiv.style.cursor = 'pointer';
            mxUtils.write(nextPageDiv, mxResources.get('more') + '...');

            var nextPage = mxUtils.bind(this, function()
            {
                selectRepo(page + 1);
            });

            mxEvent.addListener(nextPageDiv, 'click', nextPage);

            this.executeRequest(req, mxUtils.bind(this, function(req)
            {
                this.ui.tryAndHandle(mxUtils.bind(this, function()
                {
                    this.ui.spinner.stop();
                    var repos = JSON.parse(req.getText());

                    if (repos == null || repos.length == 0)
                    {
                        mxUtils.br(div);
                        mxUtils.write(div, mxResources.get('repositoryNotFound'));
                    }
                    else
                    {
                        if (page == 1)
                        {
                            div.appendChild(createLink(mxResources.get('enterValue') + '...', mxUtils.bind(this, function()
                            {
                            })));

                            mxUtils.br(div);
                            mxUtils.br(div);
                        }

                        for (var i = 0; i < repos.length; i++)
                        {
                            (mxUtils.bind(this, function(repository, idx)
                            {
                                var temp = listItem.cloneNode();
                                temp.style.backgroundColor = (idx % 2 == 0) ?
                                    ((Editor.isDarkMode()) ? '#000000' : '#eeeeee') : '';

                                temp.appendChild(createLink(repository.name, mxUtils.bind(this, function()
                                {
                                    org = repository.owner_name;
                                    repo = repository.name;
                                    repo_id = repository.id;
                                    path = '';

                                    selectFile(null);
                                })));

                                var deleteImg = document.createElement('img');
                                deleteImg.src = IMAGE_PATH + '/' + 'delete2.png';
                                deleteImg.setAttribute('align', 'absmiddle');
                                deleteImg.style.marginRight = '10px';
                                deleteImg.style.float = 'right';
                                deleteImg.style.cursor = 'pointer';
                                deleteImg.style.display = 'none';
                                deleteImg.width = 16;
                                deleteImg.onclick = mxUtils.bind(this, function ()
                                {
                                    this.ui.confirm(mxResources.get('removeIt', [repository.name]), mxUtils.bind(this, function ()
                                    {
                                        this.ui.spinner.spin(div, mxResources.get('loading'));

                                        var req = new mxXmlRequest(this.baseUrl + '/api2/repos/' + repository.id + '/', null, 'DELETE');

                                        this.executeRequest(req, mxUtils.bind(this, function(req)
                                        {
                                            this.ui.spinner.stop();
                                            selectRepo();

                                        }),mxUtils.bind(this, function(err)
                                        {
                                            this.ui.spinner.stop();
                                            this.ui.handleError({message: err.message});
                                        }));
                                    }, null));
                                });
                                temp.appendChild(deleteImg);

                                temp.addEventListener('mouseover', function() {
                                    deleteImg.style.display = 'inline-block';
                                });
                                temp.addEventListener('mouseout', function() {
                                    deleteImg.style.display = 'none';
                                });

                                div.appendChild(temp);
                            }))(repos[i], i);
                        }
                    }

                    if (repos.length == pageSize)
                    {
                        div.appendChild(nextPageDiv);

                        scrollFn = function()
                        {
                            if (div.scrollTop >= div.scrollHeight - div.offsetHeight)
                            {
                                nextPage();
                            }
                        };

                        mxEvent.addListener(div, 'scroll', scrollFn);
                    }
                }));
            }), error);
        });

        selectRepo();
    };


    /**
     * Authorizes the client, gets the userId and calls <open>.
     */
    OwnCloudClient.prototype.updateUser = function(success, error, failOnAuth)
    {
        var acceptResponse = true;

        var timeoutThread = window.setTimeout(mxUtils.bind(this, function()
        {
            acceptResponse = false;
            error({code: App.ERROR_TIMEOUT, message: mxResources.get('timeout')});
        }), this.ui.timeout);

        var userReq = new mxXmlRequest(this.baseUrl + '/api2/account/info/', null, 'GET');
        var temp = this.authToken + ' ' +  _token;

        userReq.setRequestHeaders = function(request, params)
        {
            request.setRequestHeader('Authorization', temp);
        };

        userReq.send(mxUtils.bind(this, function()
        {
            window.clearTimeout(timeoutThread);

            if (acceptResponse)
            {
                if (userReq.getStatus() === 401)
                {
                    if (!failOnAuth)
                    {
                        this.logout();

                        this.authenticate(mxUtils.bind(this, function()
                        {
                            this.updateUser(success, error, true);
                        }), error);
                    }
                    else
                    {
                        error({code: userReq.getStatus(), message:
                                this.getErrorMessage(userReq,
                                    mxResources.get('accessDenied'))});
                    }
                }
                else if (userReq.getStatus() < 200 || userReq.getStatus() >= 300)
                {
                    error({message: mxResources.get('accessDenied')});
                }
                else
                {
                    var userInfo = JSON.parse(userReq.getText());
                    this.setUser(new DrawioUser(userInfo['login_id'], userInfo['email'], userInfo['name'], userInfo['avatar_url']));
                    success();
                }
            }
        }), error);
    }


    OwnCloudClient.prototype.shareFile = function(file)
    {
        var token = null;
        var link = null;

        var content = document.createElement('div');
        content.style.whiteSpace = 'nowrap';
        content.style.overflow = 'hidden';
        content.style.height = '100px';
        content.style.display = 'flex';

        var dlg = new CustomDialog(this.ui, content);
        dlg.container.removeChild(dlg.okButton.parentNode)
        this.ui.showDialog(dlg.container, 650, 100, true, true);
        this.ui.spinner.spin(content, mxResources.get('loading'));

        var box = document.createElement('div');
        box.style.height = '100%';
        box.style.border = '1px solid lightgray';
        box.style.boxSizing = 'border-box';
        box.style.overflow = 'auto';
        box.style.lineHeight = '1.2em';

        var navs = box.cloneNode();
        navs.style.flex = '2';
        navs.style.marginRight = '-1px';
        content.appendChild(navs);

        var tabs = document.createElement('div');
        tabs.style.textAlign = 'center';
        tabs.style.cursor = 'pointer';
        tabs.style.padding = '16px';

        var setCss = function (activeTab, inactiveTab)
        {
            activeTab.style.borderRight = '3px solid #1E90FF';
            activeTab.style.color = '#1E90FF';

            if (inactiveTab != null)
            {
                inactiveTab.style.borderRight = '3px solid transparent';
                inactiveTab.style.color = 'black';
            }
        }

        var tab1 = tabs.cloneNode();
        tab1.innerText = mxResources.get('shareEditLink');
        tab1.onclick = function() {
            setCss(tab1, tab2);
            link = window.DRAWIO_SERVER_URL + '?title=' + file.meta.name + '#UchartId=' + token;
            showLink();
        };
        var tab2 = tabs.cloneNode();
        tab2.innerText = mxResources.get('embedHtmlLink');
        tab2.onclick = function() {
            setCss(tab2, tab1);
            link = window.DRAWIO_SERVER_URL + 'embed.html?title=' + file.meta.name + '&chartId=' + token;
            showLink();
        };
        setCss(tab1, tab2);
        navs.appendChild(tab1);
        navs.appendChild(tab2);

        var main = box.cloneNode();
        main.style.flex = '8';
        content.appendChild(main);

        var div = document.createElement('div');
        div.style.textAlign = 'center';
        div.style.margin = '30px 0px';
        main.appendChild(div);

        var span = document.createElement('span');
        span.style.fontSize = '15px';
        span.style.width = '440px';
        span.style.height = '20px';
        span.style.whiteSpace = 'nowrap';
        span.style.overflow = 'hidden';
        span.style.textOverflow = 'ellipsis';
        span.style.display = 'inline-block';
        span.style.verticalAlign = 'middle';
        div.appendChild(span);

        var button = document.createElement('button');
        button.innerText = mxResources.get('copy');
        button.style.marginLeft = '8px';
        button.style.cursor = 'pointer';
        button.style.width = '45px';
        button.style.height = '35px';
        button.onclick = function() {
            // navigator clipboard 需要https等安全上下文
            if (navigator.clipboard && window.isSecureContext) {
                // navigator clipboard 向剪贴板写文本
                return navigator.clipboard.writeText(link);
            } else {
                // 创建text area
                let textArea = document.createElement("textarea");
                textArea.value = link;
                // 使text area不在viewport，同时设置不可见
                textArea.style.position = "absolute";
                textArea.style.opacity = 0;
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                return new Promise((res, rej) => {
                    // 执行复制命令并移除文本框
                    document.execCommand('copy') ? res() : rej();
                    textArea.remove();
                });
            }
        };
        div.appendChild(button);

        var showLink = mxUtils.bind(this, function () {
            span.innerText = link;
        });

        var error = mxUtils.bind(this, function(err)
        {
            this.ui.handleError(err, null, mxUtils.bind(this, function()
            {
                this.ui.spinner.stop();
                this.ui.hideDialog();
            }), null, {});
        });


        var req = new mxXmlRequest(this.baseUrl + '/api/v2.1/share-links/?repo_id=' + file.meta.repo_id +
            '&path=' + encodeURIComponent(file.meta.path + '/' + file.meta.name), null, 'GET');
        this.executeRequest(req, mxUtils.bind(this, function(req)
        {
            var res = JSON.parse(req.getText())
            if (res.length > 0)
            {
                this.ui.spinner.stop();
                token = res[0].token;
                link = window.DRAWIO_SERVER_URL + '?title=' + file.meta.name + '#UchartId=' + token;
                showLink();
            }
            else
            {
                const form = new FormData();
                form.append('repo_id', file.meta.repo_id);
                form.append('path', file.meta.path + '/' + file.meta.name);

                var createLinkReq = new mxXmlRequest(this.baseUrl + '/api/v2.1/share-links/', form, 'POST');
                this.executeRequest(createLinkReq, mxUtils.bind(this, function(req)
                {
                    this.ui.spinner.stop();
                    token = JSON.parse(req.getText()).token;
                    link = window.DRAWIO_SERVER_URL + '?title=' + file.meta.name + '#UchartId=' + token;
                    showLink();
                }), error);
            }
        }), error);
    }

    /**
     * Authorizes the client, gets the userId and calls <open>.
     */
    OwnCloudClient.prototype.getErrorMessage = function(req, defaultText)
    {
        try
        {
            var temp = JSON.parse(req.getText());

            if (temp != null && temp.message != null)
            {
                defaultText = temp.message;
            }
        }
        catch (e)
        {
            // ignore
        }

        return defaultText;
    };

    /**
     * Checks if the client is authorized and calls the next step.
     */
    OwnCloudClient.prototype.logout = function()
    {
        this.clearPersistentToken();
        this.setUser(null);
        _token = null;
    };

})();
