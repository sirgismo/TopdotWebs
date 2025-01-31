{\rtf1\ansi\ansicpg1252\cocoartf2636
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww18900\viewh18280\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 <?php\
require_once 'vendor/autoload.php';\
\
// Get form data\
$name = $_POST['name'];\
$email = $_POST['email'];\
$message = $_POST['message'];\
\
// Set up SendGrid\
$sendgrid = new \\SendGrid('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');\
$email = new \\SendGrid\\Mail\\Mail();\
$email->setFrom($email);\
$email->setSubject('New message from your contact form');\
$email->addTo('info@topdot.ca');\
$email->addContent("text/plain", "Name: $name\\nEmail: $email\\nMessage: $message");\
\
// Send email\
try \{\
  $response = $sendgrid->send($email);\
  echo 'Email sent successfully!';\
\} catch (Exception $e) \{\
  echo 'There was an error sending the email: ' . $e->getMessage();\
\}\
}