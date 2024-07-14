(function () {

    var _token = null;
    var _cookies = null;

    window.Yun139Client = function (editorUi)
    {
        DrawioClient.call(this, editorUi, 'yun139auth');
    };

    // Extends DrawioClient
    mxUtils.extend(Yun139Client, DrawioClient);

    /**
     * Default extension for new files.
     */
    Yun139Client.prototype.extension = '.drawio';

    /**
     * Base URL for API calls.
     */
    Yun139Client.prototype.baseUrl = DRAWIO_YUN139_URL;

    Yun139Client.prototype.baseHostUrl = DRAWIO_YUN139_URL;

    Yun139Client.prototype.redirectUri = window.DRAWIO_SERVER_URL + 'yun139';

    /**
     * Maximum file size of the GitHub REST API.
     */
    Yun139Client.prototype.maxFileSize = 50000000 /*50MB*/;

    /**
     * Authorizes the client, gets the userId and calls <open>.
     */
    Yun139Client.prototype.authenticate = function(success, error)
    {
        var req = new mxXmlRequest(this.redirectUri + '?getState=1', null, 'GET');

        req.send(mxUtils.bind(this, function(req)
        {
            if (req.getStatus() >= 200 && req.getStatus() <= 299)
            {
                this.authenticateStep2(req.getText(), success, error);
            }
            else if (error != null)
            {
                error(req);
            }
        }), error);
    };

    window.addEventListener('message', function (e) {
        if(e.origin === DRAWIO_YUN139_URL && window.onYun139Callback != null){
            // console.log(e.data)
            window.onYun139Callback(e.data)
        }
    })

    Yun139Client.prototype.authenticateStep2 = function(state, success, error)
    {
        if (window.onYun139Callback == null)
        {
            var auth = mxUtils.bind(this, function()
            {
                var acceptAuthResponse = true;

                this.ui.showYun139AuthDialog(this, false, mxUtils.bind(this, function(remember, authSuccess)
                {
                    var win = window.open('https://yun.139.com/w/#/index', 'yun139auth');

                    if (win != null)
                    {
                        window.onYun139Callback = mxUtils.bind(this, function(newAuthInfo)
                        {
                            if (acceptAuthResponse)
                            {
                                window.onYun139Callback = null;
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

                                    _token = newAuthInfo;
                                    _cookies = this.cookieToJson(_token)
                                    this.setUser(null);

                                    if (remember)
                                    {
                                        this.setPersistentToken('remembered');
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
                        window.onYun139Callback = null;
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


    var getNewSign = function (e, t, a, n) {
        var i = ""
            , r = "";
        if (t) {
            // var s = Object.assign({}, t);
            // r = JSON.stringify(s),
            r = t
                r = encodeURIComponent(r);
            var c = r.split("")
                , u = c.sort();
            r = u.join("")
        }
        var d = md5(btoa(r))
            , f = md5(a + ":" + n);
        return i = md5(d + f).toUpperCase(),
            i
    }

    var formatDate = function (timestamp) {
        // 创建一个新的Date对象，传入时间戳（毫秒需要转换为秒）
        var date = new Date(timestamp * 1); // 注意：这里实际上不需要乘以1，因为JavaScript会自动处理

        // 获取年、月、日、时、分、秒
        var year = date.getFullYear();
        var month = ("0" + (date.getMonth() + 1)).slice(-2); // 月份是从0开始的，所以需要+1，并且用"0"填充
        var day = ("0" + date.getDate()).slice(-2); // 用"0"填充
        var hours = ("0" + date.getHours()).slice(-2); // 用"0"填充
        var minutes = ("0" + date.getMinutes()).slice(-2); // 用"0"填充
        var seconds = ("0" + date.getSeconds()).slice(-2); // 用"0"填充

        // 拼接成字符串
        return year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
    }


    var getRandomString = function (length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }


    /**
     * Authorizes the client, gets the userId and calls <open>.
     */
    Yun139Client.prototype.executeRequest = function(req, success, error, ignoreNotFound, returnNotFound)
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
            var timestamp = (new Date()).getTime(); // 获取当前时间的时间戳
            var timeFormat = formatDate(timestamp);
            var randomString = getRandomString(16);

            try
            {
                var params = JSON.parse(req.params)
                params['commonAccountInfo'] = {
                    "account": atob(_cookies['ORCHES-I-ACCOUNT-ENCRYPT']), "accountType": 1
                }
                req.params = JSON.stringify(params);
            }
            catch (e)
            {
                // ignore
            }


            req.setRequestHeaders = function(request, params)
            {
                request.setRequestHeader('_token', _token);
                request.setRequestHeader('sign', timeFormat + "," + randomString + "," + getNewSign(undefined, params, timeFormat, randomString));
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
    Yun139Client.prototype.getFile = function(path, success, error, asLibrary, checkExists, knownRefPos){
        var req = new mxXmlRequest(DRAWIO_SERVER_URL + 'yun139api?path=' + encodeURIComponent(path), null, 'GET');
        this.executeRequest(req, mxUtils.bind(this, function(req)
        {
            try
            {
                var content = req.getText()
                success(new Yun139File(this.ui, content))
            }
            catch (e)
            {
                error(e);
            }
        }), error);
    }


    /**
     * Translates this point by the given vector.
     *
     * @param {number} dx X-coordinate of the translation.
     * @param {number} dy Y-coordinate of the translation.
     */
    Yun139Client.prototype.insertFile = function(filename, data, success, error, asLibrary, folderId, base64Encoded)
    {
        asLibrary = (asLibrary != null) ? asLibrary : false;

        var tokens = folderId.split('/');
        var groupId = tokens[0];
        var path = tokens.slice(1, tokens.length).join('/');

        var params = {
            "groupID": groupId,
            "catalogID": path.split('/').pop(),
            "path": path,
            "filterType": 0,
            "catalogSortType": 0,
            "contentSortType": 0,
            "contentType": 0,
            "sortDirection": 1,
            "startNumber": 1,
            "endNumber": 100,
            "channelList": "",
            "catalogType": -1,
            "contentSuffix": "",
        }
        var req = new mxXmlRequest(window.DRAWIO_SERVER_URL + 'yun139api?action=queryGroupContentList',
            JSON.stringify(params), 'POST');

        var newFile = mxUtils.bind(this,function (meta) {
            success(new Yun139File(this.ui, data, meta));
        })

        var checkExists = mxUtils.bind(this, function () {
            this.executeRequest(req, mxUtils.bind(this, function(req)
            {
                try
                {
                    var res = JSON.parse(req.getText())['data']['getGroupContentResult']
                    var contentList = res['contentList'];

                    for (let i = 0; i < contentList.length; i++)
                    {
                        if (contentList[i]['contentName'] === filename)
                        {
                            var resume = this.ui.spinner.pause();
                            this.ui.confirm(mxResources.get('replaceIt', [filename]), function()
                            {
                                resume();
                                var contentID = contentList[i]['contentID'];
                                newFile({'groupId': groupId, 'name': filename, 'path': path,
                                    'isNew': false, 'contentID': contentID})
                            }, function()
                            {
                                resume();
                                error()
                            });
                            return;
                        }
                    }
                    // no exist
                    newFile({'groupId': groupId, 'name': filename, 'path': path,
                        'isNew': true, 'contentID': ''})
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
    Yun139Client.prototype.saveFile = function(file, success, error, overwrite, message)
    {

        // success(new Yun139File(this.ui, data, {'groupId': groupId,
        //     'name': filename, 'path': path, 'isNew': isNew}));
        var groupId = file.meta.groupId;
        var path = file.meta.path;
        var filename = file.meta.name;

        var fn = mxUtils.bind(this, function(data)
        {
            this.writeFile(file, groupId, path, filename, data,
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
                // fn(stringToArrayBuffer(file.getData()));
                // fn(Base64.encode(file.getData()));
                fn(file.getData());
            }
        });

        fn2();
    };

    function stringToArrayBuffer(str) {
        const encoder = new TextEncoder(); // 创建TextEncoder实例
        const uint8Array = encoder.encode(str); // 将字符串转换为Uint8Array
        return uint8Array.buffer; // 返回ArrayBuffer
    }
    /**
     *
     */
    Yun139Client.prototype.writeFile = function(file, groupId, path, filename, data, success, error)
    {
        if (data.length >= this.maxFileSize)
        {
            error({message: mxResources.get('drawingTooLarge') + ' (' +
                    this.ui.formatFileSize(data.length) + ' / 1 MB)'});
        }
        else
        {
            var uploadFile = mxUtils.bind(this, function(){
                var params = {
                    "groupID": groupId,
                    "path": path,
                    "operation": 0,
                    "parentCatalogID": path.split('/').pop(),
                    "manualRename": 2,
                    "fileCount": 1,
                    "totalSize": data.length,
                    "uploadContent": {
                        "contentName": filename,
                        "contentSize": data.length,
                        "digest": md5(data)
                    },
                    "seqNo": getSeqNo(),
                }
                var req = new mxXmlRequest(window.DRAWIO_SERVER_URL + 'yun139api?action=getGroupFileUploadURL',
                    JSON.stringify(params), 'POST');

                this.executeRequest(req, mxUtils.bind(this, function(req)
                {
                    try
                    {
                        var res = JSON.parse(req.getText())['data']['uploadResult'];
                        var redirectionUrl = res['redirectionUrl']
                        var uploadTaskID = res['uploadTaskID']
                        var newContentID = res['newContentIDList'][0]['contentID']

                        file.meta.contentID = newContentID
                        file.meta.isNew = false

                        var req2 = new mxXmlRequest(DRAWIO_SERVER_URL + 'yun139api?action=uploadFile' +
                            '&path=' + encodeURIComponent(redirectionUrl) +
                            '&filename=' + encodeURIComponent(filename) +
                            '&uploadtaskID=' + encodeURIComponent(uploadTaskID), data, 'POST');


                        this.executeRequest(req2, mxUtils.bind(this, function(req)
                        {
                            success(req);
                        }), error);
                    }
                    catch (e)
                    {
                        error(e);
                    }
                }), error);
            });


            if (!file.meta.isNew)
            {
                // delete old file
                var params = {
                    "taskType": 2,
                    "srcGroupID": groupId,
                    "contentList": [path + "/" + file.meta.contentID],
                    "catalogList": [],
                }
                var req = new mxXmlRequest(window.DRAWIO_SERVER_URL + 'yun139api?action=deleteFile',
                    JSON.stringify(params), 'POST');

                this.executeRequest(req, mxUtils.bind(this, function(req)
                {
                    uploadFile();
                }))
            }
            else
            {
                uploadFile();
            }
        }
    };


    var getSeqNo = function () {
        for (var e = [], t = "0123456789abcdef", a = 0; a < 36; a++)
            e[a] = t.substr(Math.floor(16 * Math.random()), 1);
        e[14] = "4",
        e[19] = t.substr(3 & e[19] | 8, 1),
        e[8] = e[13] = e[18] = e[23] = "-";
        var n = e.join("");
        return n = n.replace(/-/g, ""),
            n
    }

    /**
     * Checks if the client is authorized and calls the next step.
     */
    Yun139Client.prototype.pickFolder = function(fn)
    {
        this.showYun139Dialog(false, fn, true);
    };

    /**
     * Checks if the client is authorized and calls the next step.
     */
    Yun139Client.prototype.pickFile = function(fn)
    {
        fn = (fn != null) ? fn : mxUtils.bind(this, function(path)
        {
            this.ui.loadFile('H' + encodeURIComponent(path));
        });

        this.showYun139Dialog(true, fn);
    };

    /**
     *
     */
    Yun139Client.prototype.showYun139Dialog = function(showFiles, fn, hideNoFilesError)
    {
        var path = null;
        var groupId = null;
        var contentId = null;


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

        // function(editorUi, content, okFn, cancelFn, okButtonText, helpLink,
        //              buttonsContent, hideCancel, cancelButtonText, hideAfterOKFn, customButtons,
        //              marginTop)
        var dlg = new CustomDialog(this.ui, content, mxUtils.bind(this, function()
            {
                fn(groupId + '/' + path);
            }));
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

        var error = mxUtils.bind(this, function(err)
        {
            // Pass a dummy notFoundMessage to bypass special handling
            // function(resp, title, fn, invokeFnOnClose, notFoundMessage)
            this.ui.handleError(err, null, mxUtils.bind(this, function()
            {
                this.ui.spinner.stop();

                if (this.getUser() != null)
                {
                    path = null;
                    groupId = null;
                    contentId = null;

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

        var downloadFile = mxUtils.bind(this,function ()
        {
            this.ui.spinner.spin(div, mxResources.get('loading'));
            var params = {
                "contentID": contentId,
                "path": path,
                "groupID": groupId,
                "extInfo": {"isReturnCdnDownloadUrl": "1"},
            }

            var req = new mxXmlRequest(window.DRAWIO_SERVER_URL + 'yun139api?action=getGroupFileDownLoadURL',
                JSON.stringify(params), 'POST');
            this.executeRequest(req, mxUtils.bind(this, function (req)
            {
                this.ui.tryAndHandle(mxUtils.bind(this, function ()
                {
                    this.ui.spinner.stop();

                    var res = JSON.parse(req.getText());

                    this.ui.hideDialog();
                    fn(res['data']['downloadURL']);
                }), error)
            }), error, true);
        })

        var selectFile = mxUtils.bind(this, function(page)
        {
            if (page == null)
            {
                div.innerText = '';
                page = 1;
            }

            var params = {
                "groupID": groupId,
                "catalogID": path.split('/').pop(),
                "path": path,
                "filterType": 0,
                "catalogSortType": 0,
                "contentSortType": 0,
                "contentType": 0,
                "sortDirection": 1,
                "startNumber": 1 + 100 * (page - 1),
                "endNumber": 100 * page,
                "channelList": "",
                "catalogType": -1,
                "contentSuffix": "",
            }

            var req = new mxXmlRequest(window.DRAWIO_SERVER_URL + 'yun139api?action=queryGroupContentList',
                JSON.stringify(params), 'POST');
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
            // function(req, success, error, ignoreNotFound, returnNotFound)
            this.executeRequest(req, mxUtils.bind(this, function(req)
            {
                this.ui.tryAndHandle(mxUtils.bind(this, function()
                {
                    this.ui.spinner.stop();

                    if (page == 1)
                    {
                        // updatePathInfo();

                        div.appendChild(createLink('../ [Up]', mxUtils.bind(this, function()
                        {
                            var tokens = path.split('/');
                            if (tokens.length <= 4)
                            {
                                selectRepo();
                            }
                            else {
                                path = tokens.slice(0, tokens.length - 1).join('/');
                                selectFile();
                            }
                        }), '4px'));
                    }

                    var res = JSON.parse(req.getText())['data']['getGroupContentResult']
                    var catalogList = res['catalogList'];
                    catalogList.forEach(item => {
                        item.type = 'dir';
                    });
                    var contentList = res['contentList'];
                    contentList.forEach(item => {
                        item.type = 'file';
                    });
                    var files = [...catalogList, ...contentList];

                    if (files.length == 0)
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

                                        temp.appendChild(createLink((file.type == 'dir') ? file.catalogName : file.contentName, mxUtils.bind(this, function()
                                        {
                                            if (file.type == 'dir')
                                            {
                                                path = file.path;
                                                selectFile();
                                            }
                                            else if (showFiles && file.type == 'file')
                                            {
                                                contentId = file.contentID;
                                                downloadFile();
                                            }
                                        })));

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

            var params = {
                "pageParameter": {"pageNum": page, "pageSize": 100, "isReturnTotal": 1},
            }
            var req = new mxXmlRequest(window.DRAWIO_SERVER_URL + 'yun139api?action=queryGroup',
                JSON.stringify(params), 'POST');

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
            // function(req, success, error, ignoreNotFound, returnNotFound)
            this.executeRequest(req, mxUtils.bind(this, function(req)
            {
                this.ui.tryAndHandle(mxUtils.bind(this, function()
                {
                    this.ui.spinner.stop();

                    var res = JSON.parse(req.getText());
                    var groupList = res['data']['groupList']

                    if (groupList == null || groupList.length == 0)
                    {
                        mxUtils.br(div);
                        mxUtils.write(div, mxResources.get('repositoryNotFound'));
                    }
                    else
                    {
                        if (page == 1)
                        {
                                            //function(label, exec, padding, underline)
                            div.appendChild(createLink(mxResources.get('shareGroup'), mxUtils.bind(this, function()
                            {
                                // nothing to do
                            })));

                            mxUtils.br(div);
                            mxUtils.br(div);
                        }

                        for (var i = 0; i < groupList.length; i++)
                        {
                            (mxUtils.bind(this, function(group, idx)
                            {
                                var temp = listItem.cloneNode();
                                temp.style.backgroundColor = (idx % 2 == 0) ?
                                    ((Editor.isDarkMode()) ? '#000000' : '#eeeeee') : '';

                                var typeImg = document.createElement('img');
                                typeImg.src = IMAGE_PATH + '/folder.png';
                                typeImg.setAttribute('align', 'absmiddle');
                                typeImg.style.marginRight = '4px';
                                typeImg.style.marginTop = '-4px';
                                typeImg.width = 20;
                                temp.appendChild(typeImg);

                                temp.appendChild(createLink(group.groupName, mxUtils.bind(this, function()
                                {
                                    groupId = group.groupID
                                    path = '1B11fkOmP0at00019700101000000001/00019700101000000216/' + groupId;

                                    selectFile(null);
                                })));

                                div.appendChild(temp);
                            }))(groupList[i], i);
                        }
                    }

                    if (groupList.length == pageSize)
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
    }


    /**
     * Authorizes the client, gets the userId and calls <open>.
     */
    Yun139Client.prototype.updateUser = function(success, error, failOnAuth)
    {
        this.setUser(new DrawioUser(_cookies['ud_id'], "", _cookies['ORCHES-I-ACCOUNT-SIMPLIFY']));
        success();
    }

    Yun139Client.prototype.cookieToJson = function (arg) {
        let cookieArr = arg.split(";");
        let obj = {}
        cookieArr.forEach((i) => {
            let arr = i.split("=");
            obj[arr[0].trim()] =arr[1].trim();
        });
        return obj
    }

    /**
     * Authorizes the client, gets the userId and calls <open>.
     */
    Yun139Client.prototype.getErrorMessage = function(req, defaultText)
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
    Yun139Client.prototype.logout = function()
    {
        this.clearPersistentToken();
        this.setUser(null);
        _token = null;
    };

})();
