/**
 * Copyright (c) 2006-2017, JGraph Ltd
 * Copyright (c) 2006-2017, Gaudenz Alder
 */
OwnCloudFile = function(ui, data, meta)
{
    DrawioFile.call(this, ui, data);

    this.meta = meta;
    this.peer = this.ui.owncloud;
};

//Extends mxEventSource
mxUtils.extend(OwnCloudFile, DrawioFile);

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
OwnCloudFile.prototype.share = function()
{
    this.peer.shareFile(this);
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
OwnCloudFile.prototype.getId = function()
{
    return this.meta.repo_id + '/' + this.meta.path + '/' + this.meta.name;
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
OwnCloudFile.prototype.getHash = function()
{
    // return encodeURIComponent('H' + this.getId());
    return '';
};

/**
 * Returns true if copy, export and print are not allowed for this file.
 */
OwnCloudFile.prototype.getFileUrl = function()
{
    return 'https://github.com/' + encodeURIComponent(this.meta.org) + '/' +
        encodeURIComponent(this.meta.repo) + '/blob/' +
        this.meta.ref + '/' + this.meta.path;
};

/**
 * Returns true if copy, export and print are not allowed for this file.
 */
OwnCloudFile.prototype.getFolderUrl = function()
{
    return this.meta.path;
};

/**
 * Returns true if copy, export and print are not allowed for this file.
 */
OwnCloudFile.prototype.getPublicUrl = function(fn)
{
    if (this.meta.download_url != null)
    {
        try
        {
            // Checks for short-term token in URL which means private repo
            var url = new URL(this.meta.download_url);

            if (url.search != '')
            {
                fn(null);
            }
            else
            {
                mxUtils.get(this.meta.download_url, mxUtils.bind(this, function(req)
                {
                    fn((req.getStatus() >= 200 && req.getStatus() <= 299) ? this.meta.download_url : null);
                }), mxUtils.bind(this, function()
                {
                    fn(null);
                }));
            }
        }
        catch (e)
        {
            fn(null);
        }
    }
    else
    {
        fn(null);
    }
};

/**
 * Adds the listener for automatically saving the diagram for local changes.
 */
OwnCloudFile.prototype.isConflict = function(err)
{
    return err != null && err.status == 409;
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
OwnCloudFile.prototype.getMode = function()
{
    return App.MODE_OWNCLOUD;
};

/**
 * Overridden to enable the autosave option in the document properties dialog.
 */
OwnCloudFile.prototype.isAutosave = function()
{
    return false;
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
OwnCloudFile.prototype.getTitle = function()
{
    try
    {
        return this.meta.name;
    }
    catch (e) {
        return '';
    }
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
OwnCloudFile.prototype.isRenamable = function()
{
    return false;
};

/**
 * Adds the listener for automatically saving the diagram for local changes.
 */
OwnCloudFile.prototype.getLatestVersion = function(success, error)
{
    this.peer.getFile(this.getId(), success, error);
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
OwnCloudFile.prototype.save = function(revision, success, error, unloading, overwrite, message)
{
    this.doSave(this.getTitle(), success, error, unloading, overwrite, message);
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
OwnCloudFile.prototype.saveAs = function(title, success, error)
{
    this.doSave(title, success, error);
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
OwnCloudFile.prototype.doSave = function(title, success, error, unloading, overwrite, message)
{
    // Forces update of data for new extensions
    var prev = this.meta.name;
    this.meta.name = title;

    DrawioFile.prototype.save.apply(this, [null, mxUtils.bind(this, function()
    {
        this.meta.name = prev;
        this.saveFile(title, false, success, error, unloading, overwrite, message);
    }), error, unloading, overwrite]);
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
OwnCloudFile.prototype.saveFile = function(title, revision, success, error, unloading, overwrite, message)
{
    if (!this.isEditable())
    {
        if (success != null)
        {
            success();
        }
    }
    else if (!this.savingFile)
    {
        var doSave = mxUtils.bind(this, function(message)
        {
            if (this.getTitle() == title)
            {
                try
                {
                    // Sets shadow modified state during save
                    this.savingFileTime = new Date();
                    this.setShadowModified(false);
                    this.savingFile = true;

                    var savedEtag = this.getCurrentEtag();
                    var savedData = this.data;

                    this.peer.saveFile(this, mxUtils.bind(this, function(etag)
                        {
                            // Checks for changes during save
                            this.setModified(this.getShadowModified());
                            this.savingFile = false;
                            this.setDescriptorEtag(this.meta, etag);

                            this.fileSaved(savedData, savedEtag, mxUtils.bind(this, function()
                            {
                                this.contentChanged();

                                if (success != null)
                                {
                                    success();
                                }
                            }), error);
                        }),
                        mxUtils.bind(this, function(err)
                        {
                            this.savingFile = false;

                            if (this.isConflict(err))
                            {
                                this.inConflictState = true;

                                if (error != null)
                                {
                                    // Adds commit message to save after
                                    // conflict has been resolved
                                    err.commitMessage = message;
                                    error(err);
                                }
                            }
                            else if (error != null)
                            {
                                error(err);
                            }
                        }), overwrite, message);
                }
                catch (e)
                {
                    this.savingFile = false;

                    if (error != null)
                    {
                        error(e);
                    }
                    else
                    {
                        throw e;
                    }
                }
            }
            else
            {
                // Sets shadow modified state during save
                this.savingFileTime = new Date();
                this.setShadowModified(false);
                this.savingFile = true;

                this.ui.pickFolder(this.getMode(), mxUtils.bind(this, function(folderId)
                {
                    this.peer.insertFile(title, this.getData(), mxUtils.bind(this, function(file)
                    {
                        // Checks for changes during save
                        this.setModified(this.getShadowModified());
                        this.savingFile = false;

                        if (success != null)
                        {
                            success();
                        }

                        this.ui.fileLoaded(file);
                    }), mxUtils.bind(this, function()
                    {
                        this.savingFile = false;

                        if (error != null)
                        {
                            error();
                        }
                    }), false, folderId, message);
                }));
            }
        });


        doSave(message);
    }
    else if (error != null)
    {
        error({code: App.ERROR_BUSY});
    }
};
