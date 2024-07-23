import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:easy_post_v2/easy_post_v2.dart';
import 'package:easy_post_v2/src/screens/post.detail.screen.dart';
import 'package:easy_post_v2/src/screens/post.list.screen.dart';
import 'package:flutter/material.dart';

/// PostService is a service class that provides a set of methods to interact with the post collection in Firestore.
class PostService {
  static PostService? _instance;

  static PostService get instance => _instance ??= PostService._();
  PostService._();

  bool initialized = false;
  CollectionReference get col => FirebaseFirestore.instance.collection('posts');

  late Map<String, String> categories = {
    'qna': 'QnA',
    'discussion': 'Discussion',
    'news': 'News',
  };

  init({Map<String, String>? categories}) {
    initialized = true;
    this.categories = categories ?? this.categories;

    addPostTranslations();
  }

  @Deprecated('Use showPostCreateScreen or showPostUpdateScreen instead')
  Future<DocumentReference?> showPostEditScreen({
    required BuildContext context,
    required String? category,
    Post? post,
  }) {
    return showGeneralDialog<DocumentReference?>(
      context: context,
      pageBuilder: (_, __, ___) {
        return PostEditScreen(category: category);
      },
    );
  }

  /// Show a screen to create a new post.
  Future<DocumentReference?> showPostCreateScreen({
    required BuildContext context,
    String? category,
    bool enableYoutubeUrl = false,
  }) {
    return showGeneralDialog(
      context: context,
      pageBuilder: (_, __, ___) {
        return PostEditScreen(
          category: category,
          enableYoutubeUrl: enableYoutubeUrl,
        );
      },
    );
  }

  Future showPostListScreen({
    required BuildContext context,
    Post? post,
  }) {
    return showGeneralDialog(
      context: context,
      pageBuilder: (_, __, ___) {
        return const PostListScreen();
      },
    );
  }

  Future showPostDetailScreen({
    required BuildContext context,
    required Post post,
  }) {
    return showGeneralDialog(
      context: context,
      pageBuilder: (_, __, ___) {
        return PostDetailScreen(post: post);
      },
    );
  }

  Future showYoutubeScreen(
      {required BuildContext context,
      required Post post,
      bool autoPlay = false}) {
    return showGeneralDialog(
        context: context,
        pageBuilder: (_, __, ___) {
          return YoutubeScreen(post: post, autoPlay: autoPlay);
        });
  }
}
