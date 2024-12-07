/**
 * Copyright (c) 2006-2017, JGraph Ltd
 * Copyright (c) 2006-2017, Gaudenz Alder
 */
Yun139File = function(ui, data, meta)
{
    DrawioFile.call(this, ui, data);

    this.meta = meta;
    this.peer = this.ui.yun139;
};

//Extends mxEventSource
mxUtils.extend(Yun139File, DrawioFile);


/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
Yun139File.prototype.getId = function()
{
    return encodeURIComponent(this.meta.groupId) + '/' +
        encodeURIComponent(this.meta.path) + '/' +
        encodeURIComponent(this.meta.name)
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
Yun139File.prototype.getHash = function()
{
    return encodeURIComponent('H' + this.getId());
};


/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
Yun139File.prototype.getMode = function()
{
    return App.MODE_YUN139;
};

/**
 * Overridden to enable the autosave option in the document properties dialog.
 */
Yun139File.prototype.isAutosave = function()
{
    return false;
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
Yun139File.prototype.getTitle = function()
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
Yun139File.prototype.save = function(revision, success, error, unloading, overwrite, message)
{
    this.doSave(this.getTitle(), success, error, unloading, overwrite, message);
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
Yun139File.prototype.saveAs = function(title, success, error)
{
    this.doSave(title, success, error);
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
Yun139File.prototype.doSave = function(title, success, error, unloading, overwrite, message)
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
Yun139File.prototype.saveFile = function(title, revision, success, error, unloading, overwrite, message)
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
        var doSave = mxUtils.bind(this, function()
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

        doSave();

    }
    else if (error != null)
    {
        error({code: App.ERROR_BUSY});
    }
};
