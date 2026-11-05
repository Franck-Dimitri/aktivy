<?php

namespace App\Notifications;

/**
 * Notification au texte déjà rédigé (titre, corps, page à ouvrir), sous la cloche et en push.
 * Les textes sont écrits dans LiveNotification (temps réel) et ReminderNotification (rappels).
 */
abstract class TextNotification extends AppNotification
{
    protected bool $mail = false;

    /**
     * @param  string  $type  identifiant du cas, ex. « shift_started » (utile aux tests et aux statistiques)
     * @param  array<string, mixed>  $parameters
     */
    // Propriétés « protected » et non « private » : SerializesModels (classe Notification) range les
    // propriétés privées d'une classe parente sous le nom de la classe enfant, et elles seraient perdues
    // à la mise en file d'attente.
    public function __construct(
        public readonly string $type,
        protected string $category,
        protected string $heading,
        protected string $text,
        protected string $routeName,
        protected array $parameters = [],
    ) {}

    public function kind(): string
    {
        return $this->category;
    }

    public function title(): string
    {
        return $this->heading;
    }

    public function body(): string
    {
        return $this->text;
    }

    protected function route(): array
    {
        return [$this->routeName, $this->parameters];
    }

    public function toArray(object $notifiable): array
    {
        return [...parent::toArray($notifiable), 'type' => $this->type];
    }
}
