<?php
require_once 'vendor/autoload.php';

// Get form data
$name = $_POST['name'];
$email = $_POST['email'];
$message = $_POST['message'];

// Set up SendGrid
// TODO: Move API key to environment variable for security
$sendgrid = new \SendGrid('YOUR_SENDGRID_API_KEY');
$email_obj = new \SendGrid\Mail\Mail();
$email_obj->setFrom($email);
$email_obj->setSubject('New message from your contact form');
$email_obj->addTo('info@topdot.ca');
$email_obj->addContent("text/plain", "Name: $name\nEmail: $email\nMessage: $message");

// Send email
try {
  $response = $sendgrid->send($email_obj);
  echo 'Email sent successfully!';
} catch (Exception $e) {
  echo 'There was an error sending the email: ' . $e->getMessage();
}
