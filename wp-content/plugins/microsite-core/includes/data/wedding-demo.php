<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Fictional editorial fixture. Never used as customer defaults.
return array(
    'content' => array(
        'couple' => array(
            'firstName' => 'Olivia',
            'secondName' => 'James',
            'heading' => 'Together with the people we love',
        ),
        'event' => array(
            'localDateTime' => '2027-07-17T15:00',
            'timeZone' => 'Europe/London',
            'startsAt' => '',
        ),
        'venues' => array(
            array(
                'id' => 'venue-garden',
                'kind' => 'ceremony',
                'name' => 'Willowmere Walled Garden — fictional venue',
                'address' => 'Illustrative countryside location near Bath, Somerset, United Kingdom',
                'event' => array(
                    'localDateTime' => '2027-07-17T15:00',
                    'timeZone' => 'Europe/London',
                    'startsAt' => '',
                ),
            ),
            array(
                'id' => 'venue-glasshouse',
                'kind' => 'reception',
                'name' => 'The Glasshouse at Willowmere — fictional venue',
                'address' => 'The same fictional estate near Bath, Somerset, United Kingdom',
                'event' => array(
                    'localDateTime' => '2027-07-17T17:30',
                    'timeZone' => 'Europe/London',
                    'startsAt' => '',
                ),
            ),
        ),
    ),
    'appearance' => array(
        'palette' => 'ivory-ink',
        'fontPair' => 'editorial-serif',
    ),
    'entrance' => array(
        'variant' => 'reveal',
    ),
    'sections' => array(
        array(
            'id' => 'hero',
            'type' => 'hero',
            'variant' => 'split',
            'enabled' => true,
            'content' => array(
                'subtitle' => 'A summer afternoon in the garden, dinner beneath the trees, and all our favourite people in one place.',
                'cta' => 'schedule',
            ),
        ),
        array(
            'id' => 'invitation',
            'type' => 'invitation',
            'variant' => 'default',
            'enabled' => true,
            'content' => array(
                'heading' => 'The day means more with you in it',
                'text' => 'Some of you have known us since school; others have become family along the way. You have shared the ordinary Sundays, the difficult weeks and the unexpectedly wonderful evenings that brought us here.

We would love you to join us as we get married in Somerset. Come for the promises, stay for a long dinner, and leave your best song request with James. We cannot wait to celebrate with you.',
            ),
        ),
        array(
            'id' => 'story',
            'type' => 'story',
            'variant' => 'default',
            'enabled' => true,
            'content' => array(
                'heading' => 'It started with a borrowed book',
                'text' => 'We met in a tiny Bath bookshop on a rainy Saturday. Olivia was looking for a novel; James was returning one he had been meaning to finish for months. A conversation about the ending turned into coffee, and coffee turned into a walk long enough to miss both our trains.

Since then, our best moments have rarely needed much planning: cooking for friends, getting lost on coastal paths, and finding another excuse to stay for one more cup of tea. On one of those walks, with the sea below us and a very nervous James beside her, Olivia said yes.

Now we are looking forward to the next chapter, with the people who have been part of every good page so far.',
            ),
        ),
        array(
            'id' => 'venues',
            'type' => 'venues',
            'variant' => 'default',
            'enabled' => true,
            'content' => array(
                'heading' => 'One estate, two lovely settings',
                'venueIds' => array(
                    'venue-garden',
                    'venue-glasshouse',
                ),
            ),
        ),
        array(
            'id' => 'schedule',
            'type' => 'schedule',
            'variant' => 'default',
            'enabled' => true,
            'content' => array(
                'heading' => 'A little plan for the day',
                'items' => array(
                    array(
                        'id' => 'arrival',
                        'event' => array(
                            'localDateTime' => '2027-07-17T14:30',
                            'timeZone' => 'Europe/London',
                            'startsAt' => '',
                        ),
                        'title' => 'Arrive and settle in',
                        'description' => 'Take a welcome drink and find a seat in the walled garden. Please arrive by 14:45 so everyone can be seated before the ceremony.',
                        'venueId' => 'venue-garden',
                    ),
                    array(
                        'id' => 'ceremony',
                        'event' => array(
                            'localDateTime' => '2027-07-17T15:00',
                            'timeZone' => 'Europe/London',
                            'startsAt' => '',
                        ),
                        'title' => 'Our wedding ceremony',
                        'description' => 'A short ceremony, a few promises, and probably a happy tear or two. We would love to see your faces rather than your phones.',
                        'venueId' => 'venue-garden',
                    ),
                    array(
                        'id' => 'drinks',
                        'event' => array(
                            'localDateTime' => '2027-07-17T15:45',
                            'timeZone' => 'Europe/London',
                            'startsAt' => '',
                        ),
                        'title' => 'Drinks on the lawn',
                        'description' => 'A relaxed hour for photographs, canapés and catching up. There will be plenty of alcohol-free choices.',
                        'venueId' => 'venue-garden',
                    ),
                    array(
                        'id' => 'dinner',
                        'event' => array(
                            'localDateTime' => '2027-07-17T17:30',
                            'timeZone' => 'Europe/London',
                            'startsAt' => '',
                        ),
                        'title' => 'Dinner in the glasshouse',
                        'description' => 'A seasonal three-course dinner, a handful of speeches and unhurried conversation around the table.',
                        'venueId' => 'venue-glasshouse',
                    ),
                    array(
                        'id' => 'dancing',
                        'event' => array(
                            'localDateTime' => '2027-07-17T19:30',
                            'timeZone' => 'Europe/London',
                            'startsAt' => '',
                        ),
                        'title' => 'The first dance, then everyone',
                        'description' => 'Comfortable shoes are encouraged. Expect old favourites, a few questionable requests and something sweet later in the evening.',
                        'venueId' => 'venue-glasshouse',
                    ),
                    array(
                        'id' => 'last-song',
                        'event' => array(
                            'localDateTime' => '2027-07-17T23:30',
                            'timeZone' => 'Europe/London',
                            'startsAt' => '',
                        ),
                        'title' => 'One last song',
                        'description' => 'Time for final hugs. Please arrange your journey home in advance; local taxis are limited after midnight.',
                        'venueId' => 'venue-glasshouse',
                    ),
                ),
            ),
        ),
        array(
            'id' => 'guest-info',
            'type' => 'guest-info',
            'variant' => 'default',
            'enabled' => true,
            'content' => array(
                'heading' => 'Make yourself at home',
                'items' => array(
                    array(
                        'id' => 'dress',
                        'title' => 'Dress code: summer formal',
                        'text' => 'Think light suits, midi or long dresses, and colours you enjoy wearing. The ceremony is on grass and some paths are gravel, so block heels or flats may be more comfortable than stilettos. Please bring a light layer for the evening.',
                    ),
                    array(
                        'id' => 'children',
                        'title' => 'A grown-up celebration',
                        'text' => 'We have planned an adults-only day, apart from the children in our immediate wedding party. We hope the notice helps you arrange a relaxed evening away; please speak to us if this makes attending difficult.',
                    ),
                    array(
                        'id' => 'access',
                        'title' => 'Comfort and accessibility',
                        'text' => 'The main spaces are at ground level, with a short gravel route between them. Tell us beforehand if you need step-free access, a quiet place to pause, or a seat near the entrance so we can make a thoughtful plan.',
                    ),
                    array(
                        'id' => 'food',
                        'title' => 'Food for everyone',
                        'text' => 'Vegetarian and alcohol-free options are part of the menu. Please share allergies and dietary requirements directly with us before the day. This demonstration page does not collect that information.',
                    ),
                ),
            ),
        ),
        array(
            'id' => 'travel',
            'type' => 'travel',
            'variant' => 'default',
            'enabled' => true,
            'content' => array(
                'heading' => 'Getting here and staying nearby',
                'description' => 'Our fictional celebration is set just outside Bath, Somerset. Bath Spa is the nearest mainline station in this example; allow additional time for a pre-booked taxi or a relaxed drive into the countryside.

The venue and accommodation names below are invented for this demonstration. No rooms, transport or venue bookings have been made, and the photographs do not identify the fictional locations.',
                'items' => array(
                    array(
                        'id' => 'rail',
                        'name' => 'Arriving by train',
                        'description' => 'Plan to reach Bath Spa in the early afternoon and book your onward taxi before you travel. For a real invitation we would add the confirmed transfer point once guest numbers are known.',
                        'url' => 'https://www.nationalrail.co.uk/',
                    ),
                    array(
                        'id' => 'car',
                        'name' => 'Driving and parking',
                        'description' => 'In this example, guest parking would be signposted at the estate entrance. Please nominate a designated driver or arrange a return taxi; cars could be collected the following morning by prior agreement.',
                    ),
                    array(
                        'id' => 'inn',
                        'name' => 'The Orchard House — fictional accommodation',
                        'description' => 'An imagined small inn in the village, suitable for guests who would like a quiet night nearby. This is an illustrative option, not a real recommendation, room block or booking.',
                    ),
                    array(
                        'id' => 'city',
                        'name' => 'A weekend in Bath',
                        'description' => 'A central hotel or guesthouse would work well if you want to make a weekend of it. Choose and book your own accommodation; we have no partnership with any property.',
                    ),
                ),
            ),
        ),
        array(
            'id' => 'gallery',
            'type' => 'gallery',
            'variant' => 'default',
            'enabled' => true,
            'content' => array(
                'heading' => 'The feeling of the day',
                'photos' => array(),
            ),
        ),
        array(
            'id' => 'gifts',
            'type' => 'gifts',
            'variant' => 'default',
            'enabled' => true,
            'content' => array(
                'heading' => 'Your company is the lovely part',
                'text' => 'Having you with us is more than enough. There is no gift list and no expectation to bring anything. If you would like to mark the day, a handwritten note or a favourite recipe for our kitchen would mean a great deal.

Please do not send money or personal financial details through this demonstration page.',
                'links' => array(),
            ),
        ),
        array(
            'id' => 'faq',
            'type' => 'faq',
            'variant' => 'default',
            'enabled' => true,
            'content' => array(
                'heading' => 'A few things you might be wondering',
                'items' => array(
                    array(
                        'id' => 'weather',
                        'question' => 'What happens if it rains?',
                        'answer' => 'For this fictional plan, the ceremony would move into the glasshouse and the rest of the day would continue indoors. We would share any confirmed changes with guests before they travel.',
                    ),
                    array(
                        'id' => 'plus-one',
                        'question' => 'Can I bring a guest?',
                        'answer' => 'Please follow the names on your invitation. We are planning an intimate day and would ask you to speak to us before making arrangements for an additional guest.',
                    ),
                    array(
                        'id' => 'photos',
                        'question' => 'May we take photographs?',
                        'answer' => 'We would love an unplugged ceremony so everyone can be present. Afterwards, take as many happy photographs as you like; please ask before sharing pictures of other guests publicly.',
                    ),
                    array(
                        'id' => 'timing',
                        'question' => 'What time should we arrive?',
                        'answer' => 'Welcome drinks begin at 14:30 and the ceremony starts at 15:00, Europe/London. Please aim to be seated by 14:45.',
                    ),
                    array(
                        'id' => 'demo',
                        'question' => 'Is this a real wedding invitation?',
                        'answer' => 'No. Olivia, James, the event and venue arrangements are fictional. Stock photography is used for illustration. This page cannot accept RSVPs or make bookings.',
                    ),
                ),
            ),
        ),
        array(
            'id' => 'countdown',
            'type' => 'countdown',
            'variant' => 'default',
            'enabled' => true,
            'content' => array(
                'heading' => 'Until we are all together',
            ),
        ),
        array(
            'id' => 'rsvp',
            'type' => 'rsvp',
            'variant' => 'default',
            'enabled' => true,
            'content' => array(
                'heading' => 'We hope you can join us',
                'text' => 'Please let us know whether you can celebrate with us. Send one reply for your party and include yourself in the number of guests. We look forward to sharing the day with you.',
                'module' => 'shared-rsvp',
            ),
        ),
        array(
            'id' => 'contact',
            'type' => 'contact',
            'variant' => 'default',
            'enabled' => false,
            'content' => array(
                'heading' => 'A question before the day?',
                'contacts' => array(
                    array(
                        'id' => 'hosts',
                        'name' => 'Olivia & James — demonstration contact',
                        'email' => 'olivia.james@example.com',
                    ),
                ),
            ),
        ),
        array(
            'id' => 'footer',
            'type' => 'footer',
            'variant' => 'default',
            'enabled' => true,
            'content' => array(
                'text' => 'With love, and a seat saved in the story.

Fictional wedding demonstration. No bookings or venue partnerships are implied. Illustrative stock photography by Eugenia Remark / Pexels; the people pictured are not the fictional hosts.',
            ),
        ),
    ),
);
