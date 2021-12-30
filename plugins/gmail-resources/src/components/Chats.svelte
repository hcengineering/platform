<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Message, SharedMessage } from '@anticrm/gmail'
  import gmail from '../plugin'
  import { Contact, EmployeeAccount, formatName } from '@anticrm/contact'
  import contact from '@anticrm/contact'
  import { ActionIcon, IconShare, Button, ScrollBox, showPopup, Icon, Label } from '@anticrm/ui'
  import { Account, Class, getCurrentAccount, Ref, SortingOrder, Space } from '@anticrm/core'
  import setting from '@anticrm/setting'
  import Connect from './Connect.svelte'
  import Messages from './Messages.svelte'

  export let object: Contact
  export let contactString: string
  export let newMessage: boolean

  let messages: Message[] = [{
    _id: '61cb2a6e720bcb4f2ca1fb60' as Ref<Message>,
    _class: 'gmail:class:Message' as Ref<Class<Message>>,
    space: 'gmail:space:Message' as Ref<Space>,
    modifiedBy: '61c9441e8bd59fde331ec198' as Ref<Account>,
    modifiedOn: 1622030880000,
    from: 'andrey@hc.engineering',
    to: '<john.appleseed@gmail.com>',
    subject: 'Join Us June 17th as We Showcase The 3rd Gen Intel Xeon Scalable Platform',
    contact: 'andrey@hc.engineering',
    messageId: '<594b781751e44e52b3c28dd63ce1e21e@334284386>',
    content: `<!DOCTYPE html PUBLIC "-//W3C//Dth XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/Dth/xhtml1-transitional.dth">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
 <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
 <meta name="viewport" content="width=device-width">
 <title>Join Us June 17th as We Showcase The 3rd Gen Intel Xeon Scalable Platform</title>
 <style>
 :root {color-scheme: light}
 @media only screen {
 html { min-height: 100%;}
 }
 /*Eloqua footer overrides*/
 .footer_elq {height:auto!important;}
 .center {background-color:#efefef !important;-webkit-text-size-adjust: 100%;border: 0px solid #efefef !important;padding-top:10px !important;padding-bottom: 10px !important;}
 .center p, .center span {color: #262626 !important}
 .center a, .center strong {color: #0068B5!important}
 .spacer {visibility:hidden;mso-hide:all;display:none;}
 @media only screen and (max-width:695px) {
 .small-text-center {text-align: center!important}
 .small-float-center {margin: 0 auto!important;float: none!important; text-align: center!important}
 .mobile-logo {margin: 30px auto!important;}
 .mobile-logo-left {margin-top: 30px!important; margin-bottom: 30px!important;}
 table.body center {min-width: 0!important} table.body .container {width: 100%!important}table.body .columns {height: auto!important;-moz-box-sizing: border-box;-webkit-box-sizing: border-box;box-sizing: border-box;padding-left: 25px!important;padding-right: 25px!important} table.body .collapse .columns { padding-left: 0!important;padding-right: 0!important} th.small-1 {display: inline-block!important;width: 8.33333%!important}th.small-2 {display: inline-block!important;width: 16.66667%!important}th.small-3 {display: inline-block!important; width: 25%!important}th.small-4 {display: inline-block!important;width: 33.33334%!important} th.small-5 {display: inline-block!important;width: 41.66667%!important}th.small-6 {display: inline-block!important;width: 50%!important}th.small-9 {display: inline-block!important;width: 75%!important}th.small-10 {display: inline-block!important;width:
83.33333%!important}th.small-11 {display: inline-block!important;width: 91.66667%!important} th.small-12 {display: inline-block!important;width: 100%!important} .responsive {width: 100%!important;height:auto!important;display: block} .show-for-small {display: block!important;mso-hide: none!important;width: 100%!important} table.show-for-small {display: table!important;width: 100%!important} .show-for-large {display: none!important;width: 0; mso-hide: all;overflow: hidden } table.body .columns.no-padding-mobile {padding-left: 0!important;padding-right: 0!important} th.callout-inner {padding-top: 25px!important;padding-bottom: 25px!important} th.callout-inner-sides {padding-left: 0!important;padding-right: 0!important}}

@media only screen and (max-width:695px) {
	.spacerheight {
 height:37px !important;
}

.textcenter{
	text-align: center !important;
}

.respmargin{
	margin-top:30px !important;
}


}
 /* Device Styles */
 a[x-apple-data-detectors] {color: inherit!important;text-decoration: none!important;font-size: inherit!important;font-family: inherit!important;font-weight: inherit!important;line-height: inherit!important} span.MsoHyperlink { mso-style-priority: 99; color: inherit } span.MsoHyperlinkFollowed { mso-style-priority: 99; color: inherit } #MessageViewBody a { color: inherit; text-decoration: none; font-size: inherit; font-family: inherit; font-weight: inherit; line-height: inherit}
 </style>
 <!--[if gte mso 9]>
 <xml>
 <o:OfficeDocumentSettings>
 <o:AllowPNG/>
 <o:PixelsPerInch>96</o:PixelsPerInch>
 </o:OfficeDocumentSettings>
 </xml>
 <![endif]-->

 <!--[if gte mso 9]>
 <style>
 sup { font-size: 100% !important; }
 a {text-decoration: none;}
 /* STYLE OVERRIDES FOR ELOQUA FOOTER */
 .center { background-color:#efefef !important; -webkit-text-size-adjust: 100%; border: 0px solid #efefef !important; padding-top:10px !important; padding-bottom: 10px !important;}
 .center p, .center span {color: #262626 !important}
 .center a, .center strong {color: #0068B5 !important}
 .spacer {visibility:hidden;mso-hide:all;display:none;}
 </style>
 <![endif]-->
 </head>
<body style="background:#efefef;-moz-box-sizing:border-box;-ms-text-size-adjust:100%;-webkit-box-sizing:border-box;-webkit-text-size-adjust:100%;box-sizing:border-box;color:#262626;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:400;line-height:24px;margin:0;min-width:100%;padding:0;text-align:left;width:100%!important">


 

 <!--START HIDDEN PREHEADER-->
 <span style="visibility:hidden;mso-hide:all;display:none;">
 <!-- Preheader text goes here -->
 </span>
 <!--END PREHEADER-->

 <table role="presentation" bgcolor="#efefef" border="0" cellspacing="0" cellpadding="0" class="body" valign="top" width="100%">
 <tbody>
 <tr>
 <th align="center" valign="top" style="padding-top:24px;width:670px;">

 <center style="min-width:0!important;width:100%">
 <!-- BEGIN EMAIL BODY -->
 <table role="presentation" align="center" bgcolor="#ffffff" border="0" class="container" cellspacing="0" cellpadding="0" width="670">

 <tbody>
 <tr>
 <th>
 <!-- START SPARK HERO -->
 <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
 <tbody>
 <tr>
 <th>
 <!-- START LOGO -->
 <table role="presentation" bgcolor="transparent" border="0" cellspacing="0" cellpadding="0" class="" valign="top" width="100%">
 <tbody>
 <tr>

 <!-- DEFAULT 80X80PX CORNER LOGO - ONLY USE 80X80PX LOGOS FOR THIS LOGO OPTION -->
 <td align="left">
 <img src="https://img03.en25.com/EloquaImages/clients/IntelCorporation/%7Bdba0fa59-eea1-40b1-9f0e-98f6cca05163%7D_intel_logo_80x80.png" alt="Intel" class="mobile-logo" style="-ms-interpolation-mode:bicubic;display:block;outline:0;">
 </td>

 <!-- UNCOMMENT TO USE THE LEFT OFFSET LOGO INSTEAD
 <td class="small-12 columns" style="padding-top:0px;padding-bottom:0px;padding-left:80px;">
 <img src="https://img03.en25.com/EloquaImages/clients/IntelCorporation/%7Bdba0fa59-eea1-40b1-9f0e-98f6cca05163%7D_intel_logo_80x80.png" alt="Intel" style="-ms-interpolation-mode:bicubic;display:block;outline:0;">
 </td> -->

 <!-- UNCOMMENT TO USE THE CENTERED LOGO INSTEAD
 <td align="center" style="padding-top:0px;padding-bottom:0px;">
 <img src="https://img03.en25.com/EloquaImages/clients/IntelCorporation/%7Bdba0fa59-eea1-40b1-9f0e-98f6cca05163%7D_intel_logo_80x80.png" alt="Intel" class="mobile-logo" style="-ms-interpolation-mode:bicubic;display:block;outline:0;">
 </td> -->
 </tr>
 </tbody>
 </table>
 <!-- END LOGO -->
 </th>
 </tr>
 <tr>
 <th class="small-12 columns" style="padding:0;padding-left:80px;padding-right:80px;width:510px;">
 <center style="min-width:0!important;width:100%">
 <img src="https://img03.en25.com/EloquaImages/clients/IntelCorporation/%7Ba588a3bb-55df-4af6-8da5-036ca12ff2bb%7D_MKA-24072-EmailBanner-Invite1-Updated.jpg" height="286" width="510" alt="What will you solve?" title="What will you solve?" align="center" class="responsive" style="-ms-interpolation-mode:bicubic;display:block;float:none;margin:0 auto;max-width:100%;outline:0;text-align:center;text-decoration:none;height:286px;width:510px">
 </center>
 </th>
 </tr>
 <!-- START SPARKS -->
 <tr>
 <th>
 <table role="presentation" align="right" border="0" cellspacing="0" cellpadding="0" class="show-for-large" width="30">
 <tbody>
 <tr>
 <th style="padding:0;padding-right:50px;width:30px">
 <div style="background:#548FAD;width:30px">
 <img alt="" width="30" height="30" src="https://img03.en25.com/EloquaImages/clients/IntelCorporation/%7Bf0f796ec-1a68-46e2-86e8-bf4bf77ae478%7D_chip_25x25.png" style="-ms-interpolation-mode:bicubic;clear:both;display:block;max-width:100%;outline:0;text-decoration:none;width:auto">
 </div>
 </th>
 </tr>
 </tbody>
 </table>
 </th>
 </tr>
 <tr>
 <th>
 <table role="presentation" align="right" border="0" cellspacing="0" cellpadding="0" class="show-for-large" width="20">
 <tbody>
 <tr>
 <th style="padding:0;padding-right:80px;width:20px">
 <div style="background:#41728A;width:20px">
 <img alt="" src="https://img03.en25.com/EloquaImages/clients/IntelCorporation/%7Bf0f796ec-1a68-46e2-86e8-bf4bf77ae478%7D_chip_25x25.png" style="-ms-interpolation-mode:bicubic;clear:both;display:block;max-width:100%;outline:0;text-decoration:none;width:auto">
 </div>
 </th>
 </tr>
 </tbody>
 </table>
 </th>
 </tr>
 <!-- END SPARKS -->
 <tr>
 <th class="small-12 columns" style="padding:0;padding-bottom:60px;padding-left:80px;padding-right:80px;width:510px;">

 <h1 class="respmargin" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;color:#262626;font-family:Arial,Helvetica,sans-serif;font-size:37.5px;font-weight:400;hyphens:none;line-height:44.5px;margin:0;margin-top:15px;margin-bottom:15px;padding:0;text-align:center;word-break:keep-all;word-wrap:none">How Wonderful Gets Done – EMEA Ecosystem Event</h1>
 <h1 style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;color:#262626;font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:400;hyphens:none;line-height:40px;margin:0;margin-top:15px;margin-bottom:30px;padding:0;text-align:center;word-break:keep-all;word-wrap:none">June 17<sup style="line-height:32px;">th</sup>, 10:00 CET</h1>
 <p style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;color:#262626;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:400;hyphens:none;line-height:24.5px;margin:0;margin-bottom:29.5px;padding:0;text-align:center;word-break:keep-all;word-wrap:none">Imagine having the technology to solve your greatest business challenge. Imagine no more. It’s time to find your solution.</p>
 <p style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;color:#262626;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:400;hyphens:none;line-height:24.6px;margin:0;margin-bottom:29.5px;padding:0;text-align:center;word-break:keep-all;word-wrap:none">Join us <strong>June 17<sup style="line-height:18px;">th</sup> at 10:00 CET</strong>, as we showcase solutions and partner readiness of the powerful and flexible 3<sup style="line-height:18px;">rd</sup> gen Intel Xeon Scalable Platform.</p>
 
 <!-- START BUTTON -->
 <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" width="auto">
 <tbody>
 <tr>
 <th style="background:#006ABB;padding:10px 24px 10px 24px;">
 Register now<img src="https://img03.en25.com/EloquaImages/clients/IntelCorporation/%7B0230aada-0914-45c2-8d44-ea2c5ae34e04%7D_arrow_email_white.png" valign="middle" alt="">
 </th>
 </tr>
 </tbody>
 </table>
 <!-- END BUTTON -->
 </th>
 </tr>


 </tbody>
 </table>
 <!-- END SPARK HERO -->
 <!-- START DIVIDER -->
 <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
 <tbody>
 <tr>
 <th align="center" style="font-size:25px;line-height:25px;width:100%;padding-left:80px;padding-right:80px;" height="25px">
 <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
 <tbody>
 <tr>
 <th align="center" style="border-top:2px solid #00285A;font-size:25px;line-height:25px;width:100%;padding-left:80px;padding-right:80px;" height="25px">&nbsp;
 
 </th>
 </tr>
 </tbody>
 </table>
 </th>
 </tr>
 </tbody>
 </table>
 <!-- END DIVIDER -->
 <!-- START EVENTS -->
 
 <!-- START EVENTS -->
 
 <!-- START SPEAKER HIGHTLIGHTS -->
 <table role="presentation" bgcolor="transparent" border="0" cellspacing="0" cellpadding="0" class="" valign="top" width="100%">
 <tbody>
 <tr>
 <th class="small-12 columns" style="padding-bottom:60px;padding-top:35px;padding-left:80px;padding-right:80px;width:510px;">
 <!-- START CONTENT - CENTERED INSET ROWS -->
 <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
 <tbody>
 <tr>
 <th class="" style="background:#ffffff;width:100%">
 <h3 style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;color:#262626;font-family:Arial,Helvetica,sans-serif;font-size:25px;font-weight:400;hyphens:none;line-height:32px;margin:0;margin-bottom:40px;padding:0;text-align:center;word-break:keep-all;word-wrap:none">Featured Speakers</h3>
 <!-- START ROW -->
 <table role="presentation" border="0" cellspacing="0" cellpadding="0" valign="top" width="100%">
 <tbody>
 <tr>
 <th class="small-12 columns" style="padding:0;width:200px;vertical-align:top;">
 <img src="https://img03.en25.com/EloquaImages/clients/IntelCorporation/%7B57ee3938-7ec7-44c9-a411-02a7ec6c6ace%7D_MKA-24072-EmailSpeaker-Maurits-Tichelman.jpg" alt="Maurits Tichelman" title="Maurits Tichelman" align="center" height="200" width="200" style="-ms-interpolation-mode:bicubic;display:block;float:none;margin:0 auto;max-width:100%;outline:0;text-align:center;text-decoration:none;height:200px;width:200px">
 <!-- START SPACER -->
 <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" class="show-for-small" style="display:none;-mso-hide:all" width="100%">
 <tbody>
 <tr>
 <th align="center" style="font-size:16px;line-height:16px;width:100%" height="16">&nbsp;
 
 </th>
 </tr>
 </tbody>
 </table>
 <!-- END SPACER -->
 </th>
 <th class="small-12 columns" style="padding:0;padding-left:60px;width:250px">
 <p class="textcenter" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;color:#262626;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;hyphens:none;line-height:20px;margin:0;margin-bottom:8px;padding:0;text-align:left;word-break:keep-all;word-wrap:none">VP Sales and Marketing Group & GM of the EMEA Territory Group - Intel</p>
 <h3 class="textcenter" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;color:#262626;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;hyphens:none;line-height:24px;margin:0;margin-bottom:20px;padding:0;text-align:left;word-break:keep-all;word-wrap:none">Maurits Tichelman</h3>
 </th>
 </tr>
 </tbody>
 </table>
 <!-- START SPACER -->
 <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
 <tbody>
 <tr>
 <th align="center" class="spacerheight" height="32">&nbsp;
 
 </th>
 </tr>
 </tbody>
 </table>
 <!-- END SPACER -->
 <!-- END ROW -->
 <!-- START ROW -->
 <table role="presentation" border="0" cellspacing="0" cellpadding="0" valign="top" width="100%">
 <tbody>
 <tr>
 <th class="small-12 columns" style="padding:0;width:200px;vertical-align:top;">
 <img src="https://img03.en25.com/EloquaImages/clients/IntelCorporation/%7Bbf78329a-3db3-44e8-b9f7-d8bcd898c8a1%7D_MKA-24072-EmailSpeaker-Jennifer-Huffstetler.jpg" alt="Jennifer Huffstetler" title="Jennifer Huffstetler" align="center" height="200" width="200" style="-ms-interpolation-mode:bicubic;display:block;float:none;margin:0 auto;max-width:100%;outline:0;text-align:center;text-decoration:none;height:200px;width:200px">


 <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" class="show-for-small" style="display:none;-mso-hide:all" width="100%">
 <tbody>
 <tr>
 <th align="center" style="font-size:16px;line-height:16px;width:100%" height="16">&nbsp;
 
 </th>
 </tr>
 </tbody>
 </table>
 <!-- END SPACER -->

 </th>
 <th class="small-12 columns" style="padding:0;padding-left:60px;width:250px">
 <p class="textcenter" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;color:#262626;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;hyphens:none;line-height:20px;margin:0;margin-bottom:8px;padding:0;text-align:left;word-break:keep-all;word-wrap:none">VP Data Platforms Group & GM of Strategy in the Xeon and Memory Group – Intel</p>
 <h3 class="textcenter" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;color:#262626;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;hyphens:none;line-height:24px;margin:0;margin-bottom:20px;padding:0;text-align:left;word-break:keep-all;word-wrap:none">Jennifer Huffstetler</h3>


 </th>
 </tr>
 </tbody>
 </table>
 
 <!-- START SPACER -->
 <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
 <tbody>
 <tr>
 <th align="center" class="spacerheight" height="32">&nbsp;
 
 </th>
 </tr>
 </tbody>
 </table>
 <!-- END SPACER -->
 <!-- START ROW -->
 <table role="presentation" border="0" cellspacing="0" cellpadding="0" valign="top" width="100%">
 <tbody>
 <tr>
 <th class="small-12 columns" style="padding:0;width:200px;vertical-align:top;">
 <img src="https://img03.en25.com/EloquaImages/clients/IntelCorporation/%7Bc050cd4a-a18b-48c5-8471-b44453bfe3d4%7D_MKA-24072-EmailSpeaker-Kjeld-Nuis.jpg
" alt="Kjeld Nuis" title="Kjeld Nuis" align="center" height="200" width="200" style="-ms-interpolation-mode:bicubic;display:block;float:none;margin:0 auto;max-width:100%;outline:0;text-align:center;text-decoration:none;height:200px;width:200px">


 <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" class="show-for-small" style="display:none;-mso-hide:all" width="100%">
 <tbody>
 <tr>
 <th align="center" style="font-size:16px;line-height:16px;width:100%" height="16">&nbsp;
 
 </th>
 </tr>
 </tbody>
 </table>
 <!-- END SPACER -->

 </th>
 <th class="small-12 columns" style="padding:0;padding-left:60px;width:250px">
 <p class="textcenter" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;color:#262626;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;hyphens:none;line-height:20.5px;margin:0;margin-bottom:8px;padding:0;text-align:left;word-break:keep-all;word-wrap:none">Olympic Gold Medal Winner & Current World Record Holder</p>
 <h3 class="textcenter" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;color:#262626;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;hyphens:none;line-height:24px;margin:0;margin-bottom:0px;padding:0;text-align:left;word-break:keep-all;word-wrap:none">Kjeld Nuis</h3>


 </th>
 </tr>
 </tbody>
 </table>

 <!-- END ROW -->
 </th>
 </tr>
 </tbody>
 </table>
 <!-- END CONTENT - CENTERED INSET ROWS -->
 </th>
 </tr>
 </tbody>
 </table>
 <!-- END SPEAKER HIGHTLIGHTS -->
 <!-- START CONTENT - CENTERED INSET 2 -->
 <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
 <tbody>
 <tr>
 <th class="small-12 columns" style="padding-top:0px;padding-left:80px;padding-right:80px;width:510px;">

 <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
 <tbody>
 <tr>
 <th style="background:#004A86;width:100%">
 
 <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
 <tbody>
 <tr>
 <th style="padding-left:30px;padding-right:30px;width:100%">
 
 <p style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:400;hyphens:none;line-height:24.3px;margin:0;margin-top:32px;margin-bottom:32px;padding:0;text-align:center;word-break:keep-all;word-wrap:none">Explore the Event page to learn more about the sessions & partner showcase.</p>

 <!-- START BUTTON -->
 <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" width="auto">
 <tbody>
 <tr>
 <td style="background:#ffffff;padding:10px 24px 10px 24px;">
 Register now<img src="https://img03.en25.com/EloquaImages/clients/IntelCorporation/%7Bc054784c-25ad-4375-800a-72225d53db68%7D_arrow_email_blue.png" valign="middle" alt="">
 </td>
 </tr>
 </tbody>
 </table>

 <!-- END BUTTON -->
 <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
 <tbody>
 <tr>
 <th style="font-size:48px;line-height:48px;" height="48">&nbsp;</th>
 </tr>
 </tbody>
 </table>
 </th>
 </tr>
 </tbody>
 </table>
 </th>
 </tr>
 </tbody>
 </table>

 </th>
 </tr>
 </tbody>
 </table>

 <!-- START SPARKS -->
 <table role="presentation" align="left" border="0" cellspacing="0" cellpadding="0" class="show-for-large" valign="top" width="100%">
 <tbody>
 <tr>
 <th style="padding:0;padding-left:40px;padding-right:590px;width:40px">
 <div style="background:#548FAD;width:40px">
 <img alt="" src="https://img03.en25.com/EloquaImages/clients/IntelCorporation/%7Bf0f796ec-1a68-46e2-86e8-bf4bf77ae478%7D_chip_25x25.png" height="40" width="40" style="-ms-interpolation-mode:bicubic;clear:both;display:block;max-width:100%;outline:0;text-decoration:none;height:40px;width:40px">
 </div>
 </th>
 </tr>
 </tbody>
 </table>
 <!-- END SPARKS -->
 
 <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
 <tbody>
 <tr>
 <th align="center" height="60">&nbsp;
 
 </th>
 </tr>
 </tbody>
 </table>
 
 <!-- START CONTENT - CENTERED INSET 2 -->
 

 <!-- END CONTENT - CENTERED INSET 2 -->
 <!-- START SOCIAL ICONS AND LINKS -->
 
 <!-- END SOCIAL ICONS AND LINKS -->
 </th>
 </tr>
 </tbody>
 </table>
 <!-- START VIEW IN BROWSER -->
 <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" class="container" width="670">
 <tbody>
 <tr>
 <th class="small-12 columns" style="width:670px">
 <center>
 <p style="color:#0068B5;display:block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;hyphens:none;line-height:12px;margin:0;margin-left:auto;margin-right:auto;margin-top:15px;margin-bottom:15px;padding:0;text-align:center;">
 View in browser.</p>
 </center>
 </th>
 </tr>
 </tbody>
 </table>
 <!-- END VIEW IN BROWSER -->

 </center>
 </th>
 </tr>
 </tbody>
 </table>

 <!-- prevent Gmail on iOS font size manipulation -->
 <div style="display:none;white-space:nowrap;font:15px courier;line-height:0"> &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; </div>

 

<!-- START Eloqua Footer - Standard | Version 1.1 -->
<table class="body footer_elq" style="Margin:0;background-color:transparent;border-collapse:collapse;border-spacing:0;color:#555554;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;height:100%;line-height:20px;margin:0;padding:0;text-align:center;vertical-align:top;width:100%">
	<tbody>
 <tr style="background-color:transparent;border:0 solid transparent;border-collapse:collapse;padding:0;text-align:center;vertical-align:top">
 <td align="center" class="center" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;Margin:0;background-color:transparent;border:0 solid transparent;border-collapse:collapse!important;color:#555554;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;hyphens:none;line-height:20px;margin:0;padding:0;text-align:center;vertical-align:top;word-break:keep-all;word-wrap:break-word" valign="top">
 <div><!--[if !mso]><!-->
 <table align="center" cellpadding="0" cellspacing="0" style="background-color:transparent;border:0 solid transparent;border-collapse:collapse;border-spacing:0;max-width:600px!important;padding:0;text-align:center;vertical-align:top;width:100%"><!--<![endif]--><!--[if gte mso 9]><table align="center" cellpadding="0" cellspacing="0" width="670" ><![endif]-->
 <tbody>
 <tr style="background-color:transparent;border:0 solid transparent;border-collapse:collapse;padding:0;text-align:center;vertical-align:top">
 <td style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;Margin:0;background-color:transparent;border:0 solid transparent;border-collapse:collapse!important;color:#555554;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;hyphens:none;line-height:20px;margin:0;padding:0;text-align:center;vertical-align:top;word-break:keep-all;word-wrap:break-word">
 <table class="row collapse mobile-padding" style="background-color:transparent;border:0 solid transparent;border-collapse:collapse;border-spacing:0;padding:0;position:relative;text-align:center;vertical-align:top;width:100%">
 <tbody>
 <tr style="background-color:transparent;border:0 solid transparent;border-collapse:collapse;padding:0;text-align:center;vertical-align:top">
 <th class="small-12 large-12 columns first last" style="Margin:0 auto;background-color:transparent;border:0 solid transparent;border-collapse:collapse;color:#555554;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;line-height:20px;margin:0 auto;padding:0;padding-bottom:20px;padding-left:0;padding-right:0;text-align:center;width:680px">
 <table style="background-color:transparent;border:0 solid transparent;border-collapse:collapse;border-spacing:0;padding:0;text-align:center;vertical-align:top;width:100%">
 <tbody>
 <tr style="background-color:transparent;border:0 solid transparent;border-collapse:collapse;padding:0;text-align:center;vertical-align:top">
 <th style="Margin:0;background-color:transparent;border:0 solid transparent;border-collapse:collapse;color:#555554;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;line-height:20px;margin:0;padding:0;text-align:center">
 <table class="spacer" style="background-color:transparent;border:0 solid transparent;border-collapse:collapse;border-spacing:0;padding:0;text-align:center;vertical-align:top;width:100%">
 <tbody>
 <tr style="background-color:transparent;border:0 solid transparent;border-collapse:collapse;padding:0;text-align:center;vertical-align:top">
 <td height="20px" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;Margin:0;background-color:transparent;border:0 solid transparent;border-collapse:collapse!important;color:#555554;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:400;hyphens:none;line-height:20px;margin:0;padding:0;text-align:center;vertical-align:top;word-break:keep-all;word-wrap:break-word">&nbsp;</td>
 </tr>
 </tbody>
 </table>

 <p class="text-center" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;Margin:0;Margin-bottom:10px;border-collapse:collapse!important;color:#959595;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;hyphens:none;line-height:18px;margin:0;margin-bottom:10px;padding:0;text-align:center;word-break:keep-all"><p class="text-center" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;Margin:0;Margin-bottom:10px;border-collapse:collapse!important;color:#959595;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;hyphens:none;line-height:18px;margin:0;margin-bottom:10px;padding:0;text-align:center;word-break:keep-all">This was sent to <strong>Bykhov.denis@gmail.com</strong> because you are subscribed to <strong>Events &amp; Tradeshows</strong>. To view and manage your marketing-related email preferences with Intel, please click here.</p>
</p>

 <p class="text-center" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;Margin:0;Margin-bottom:10px;border-collapse:collapse!important;color:#959595;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;hyphens:none;line-height:18px;margin:0;margin-bottom:10px;padding:0;text-align:center;word-break:keep-all">&copy; 2021 Intel Corporation<br />
 Intel Corporation, 2200 Mission College Blvd., M/S RNB4-145, Santa Clara, CA 95054 USA. www.intel.com</p>

 <p class="text-center" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;Margin:0;Margin-bottom:10px;border-collapse:collapse!important;color:#959595;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;hyphens:none;line-height:18px;margin:0;margin-bottom:10px;padding:0;text-align:center;word-break:keep-all">Privacy | Cookies | *Trademarks | Unsubscribe | Manage Preferences</p>

 <table class="spacer" style="background-color:transparent;border:0 solid transparent;border-collapse:collapse;border-spacing:0;padding:0;text-align:center;vertical-align:top;width:100%">
 <tbody>
 <tr style="background-color:transparent;border:0 solid transparent;border-collapse:collapse;padding:0;text-align:center;vertical-align:top">
 <td height="10px" style="-moz-hyphens:none;-ms-hyphens:none;-webkit-hyphens:none;Margin:0;background-color:transparent;border:0 solid transparent;border-collapse:collapse!important;color:#555554;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:400;hyphens:none;line-height:10px;margin:0;padding:0;text-align:center;vertical-align:top;word-break:keep-all;word-wrap:break-word">&nbsp;</td>
 </tr>
 </tbody>
 </table>
 </th>
 <th class="expander" style="Margin:0;background-color:transparent;border:0 solid transparent;border-collapse:collapse;color:#555554;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;line-height:20px;margin:0;padding:0!important;text-align:center;visibility:hidden;width:0">&nbsp;</th>
 </tr>
 </tbody>
 </table>
 </th>
 </tr>
 </tbody>
 </table>
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </td>
 </tr>
	</tbody>
</table>
<!-- END Eloqua Footer - Standard | Version 1.1 -->

<img src='https://s334284386.t.en25.com/e/FooterImages/FooterImage1?elq=594b781751e44e52b3c28dd63ce1e21e&siteid=334284386' alt="" border=0 width=1px height=1px></body></html>`,
    textContent: `"Intel" "What will you solve?" "" "" How Wonderful Gets Done – EMEA Ecosystem Event----------------------------------------------June 17th, 10:00 CET---------------------------------------------------------Imagine having the technology to solve your greatest business challenge. Imagine no more. It’s time to find your solution.Join us June 17th at 10:00 CET, as we showcase solutions and partner readiness of the powerful and flexible 3rd gen Intel Xeon Scalable Platform.Register now"" Featured Speakers-----------------"Maurits Tichelman" VP Sales and Marketing Group & GM of the EMEA Territory Group - IntelMaurits Tichelman-----------------"Jennifer Huffstetler" VP Data Platforms Group & GM of Strategy in the Xeon and Memory Group – IntelJennifer Huffstetler--------------------"Kjeld Nuis" Olympic Gold Medal Winner & Current World Record HolderKjeld Nuis----------Explore the Event page to learn more about the sessions & partner showcase.Register now"" "" View in browser. This was sent to Bykhov.denis@gmail.com because you are subscribed to Events & Tradeshows. To view and manage your marketing-related email preferences with Intel, please click here .© 2021 Intel CorporationIntel Corporation, 2200 Mission College Blvd., M/S RNB4-145, Santa Clara, CA 95054 USA. www.intel.com Privacy | Cookies | *Trademarks | Unsubscribe | Manage Preferences`
  }] // todo remove, dev only; = []
  let account: EmployeeAccount | undefined
  let enabled: boolean = true // todo remove, dev only;
  let selected: Set<Ref<SharedMessage>> = new Set<Ref<SharedMessage>>()
  let selectable = false
  let me = 'john.appleseed@gmail.com' // todo remove, dev only; = ''

  const messagesQuery = createQuery()
  const accauntQuery = createQuery()
  const settingsQuery = createQuery()
  const accountId = getCurrentAccount()._id

  $: messagesQuery.query(
    gmail.class.Message,
    { modifiedBy: accountId, contact: { $like: '%' + contactString + '%' } },
    (res) => {
      // messages = res
    },
    { sort: { modifiedOn: SortingOrder.Descending } }
  )

  $: accauntQuery.query(contact.class.EmployeeAccount, { _id: accountId as Ref<EmployeeAccount> }, (result) => {
    account = result[0]
  })

  $: settingsQuery.query(
    setting.class.Integration,
    { type: gmail.integrationType.Gmail, space: accountId as string as Ref<Space> },
    (res) => {
      // enabled = res.length > 0
      // me = res[0].value
    }
  )
  const client = getClient()

  async function share (): Promise<void> {
    const selectedMessages = messages.filter((m) => selected.has(m._id as string as Ref<SharedMessage>))
    await client.addCollection(gmail.class.SharedMessages, object.space, object._id, object._class, 'gmailMessages', {
      messages: convertMessages(selectedMessages)
    })
    clear()
  }

  function clear (): void {
    selectable = false
    selected.clear()
    selected = selected
  }

  function convertMessages (messages: Message[]): SharedMessage[] {
    return messages.map((m) => {
      return {
        ...m,
        _id: m._id as string as Ref<SharedMessage>,
        sender: account ? getName(m, account, true) : '',
        receiver: account ? getName(m, account, false) : '',
        incoming: !amISender(m)
      }
    })
  }

  function getName (message: Message, account: EmployeeAccount, sender: boolean): string {
    return amISender(message) !== sender
      ? `${formatName(object.name)} (${contactString})`
      : `${formatName(account.name)} (${me})`
  }

  function amISender (message: Message): boolean {
    return !message.from.includes(contactString)
  }
</script>

<div class="flex-between header">
  {#if selectable}
    <div class="flex-between w-full">
      <span>{selected.size} <Label label={gmail.string.MessagesSelected} /></span>
      <div class="flex">
        <div>
          <Button label={'Cancel'} size={'small'} on:click={clear} />
        </div>
        <div class="ml-3">
          <Button
            label={gmail.string.PublishSelected}
            size={'small'}
            primary
            disabled={!selected.size}
            on:click={share}
          />
        </div>
      </div>
    </div>
  {:else if enabled}
    <div class="flex-center icon"><div class="scale-75"><Icon icon={contact.icon.Email} size="small" /></div></div>
    <div class="flex-grow flex-col">
      <div class="fs-title">Gmail</div>
      <div class="small-text content-dark-color"><Label label={gmail.string.YouAnd} /> {formatName(object.name)}</div>
    </div>
    <div class="mr-3">
      <Button
        label={gmail.string.CreateMessage}
        size={'small'}
        primary
        on:click={() => {
          newMessage = true
        }}
      />
    </div>
    <ActionIcon
      icon={IconShare}
      size={'medium'}
      label={gmail.string.ShareMessages}
      direction={'bottom'}
      action={async () => {
        selectable = !selectable
      }}
    />
  {:else}
    <div class="flex-center">
      <Button
        label={gmail.string.Connect}
        primary
        on:click={(e) => {
          showPopup(Connect, {}, e.target)
        }}
      />
    </div>
  {/if}
</div>
<div class="h-full right-content">
  <ScrollBox vertical stretch>
    {#if messages}
      <Messages messages={convertMessages(messages)} {selectable} bind:selected on:select />
    {/if}
  </ScrollBox>
</div>

<style lang="scss">
  .header {
    flex-shrink: 0;
    padding: 0 6rem 0 2.5rem;
    height: 4rem;
    color: var(--theme-content-accent-color);
    border-bottom: 1px solid var(--theme-zone-bg);

    .icon {
      margin-right: 1rem;
      width: 2.25rem;
      height: 2.25rem;
      color: var(--theme-caption-color);
      background-color: var(--primary-button-enabled);
      border-radius: 50%;
    }
  }

  .right-content {
    flex-grow: 1;
    padding: 1.5rem 1rem;
  }
</style>
