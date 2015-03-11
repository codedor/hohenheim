/**
 *
 * Alchemy: Node.js MVC Framework
 * Copyright 2013-2013
 *
 * Licensed under The MIT License
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright   Copyright 2013-2013
 * @since       0.0.1
 * @license     MIT License (http://www.opensource.org/licenses/mit-license.php)
 */
alchemy.usePlugin('styleboost');
alchemy.usePlugin('jquery');
alchemy.usePlugin('jsoneditor');
alchemy.usePlugin('select2');
alchemy.usePlugin('i18n');
alchemy.usePlugin('acl', {baselayout: 'base', bodylayout: 'body', mainlayout: ['acl_main', 'admin_main', 'main'], mainblock: 'main', contentblock: 'content'});
alchemy.usePlugin('menu');
alchemy.usePlugin('chimera', {title: 'Hohenheim'});

alchemy.hawkejs.on({type: 'viewrender', status: 'begin', client: false}, function onBegin(viewRender) {
	var sections = {
	    'administration' : {
	        'settings'  :         {title: 'Settings',          type: 'SettingsAction', parameters: {controller: 'settings',     subject: 'settings',          action: 'index'}},
	        'i18n':               {title: 'Translations',      type: 'ModelAction',    parameters: {controller: 'editor',       subject: 'i18n',              action: 'index'}},
	        'user':               {title: 'Users',             type: 'ModelAction',    parameters: {controller: 'editor',       subject: 'users',             action: 'index'}},
	        'groups':             {title: 'User Groups',       type: 'ModelAction',    parameters: {controller: 'editor',       subject: 'acl_groups',        action: 'index'}},
	        'rules':              {title: 'ACL',               type: 'ModelAction',    parameters: {controller: 'editor',       subject: 'acl_rules',         action: 'index'}},
	    },
	    'sites' : {
			'site'       :        {title: 'Site',              type: 'ModelAction',    parameters: {controller: 'editor',  subject: 'sites',          action: 'index'}},
			'request'    :        {title: 'Request',           type: 'ModelAction',    parameters: {controller: 'editor',  subject: 'requests',       action: 'index'}}
	    }
	};

	viewRender.script('menu/treeify');
	viewRender.set('sections', sections);
	viewRender.set('project_title', 'Hohenheim');
});
