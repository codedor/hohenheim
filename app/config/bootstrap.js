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
